// Live-score watcher — long-running daemon that ingests snapshot JSON files dropped
// by the Hermes browser agent. Mirrors scripts/crawl-results.ts: builds its own Admin
// SDK Firestore handle from Application Default Credentials, so it imports only the
// dependency-injected ingest path (no `server-only` modules) and writes PROD Firestore.
//
// Run with (Node 22):
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> LIVE_INBOX_DIR=./live-inbox npm run watch:live
//   ... -- --dry-run        validate + resolve + log, write nothing
//   ... -- --once           drain the current backlog and exit (CI / e2e)
//
// Contract: each *.json in the inbox is a Snapshot (src/lib/server/live/schema.ts).
// On success the file is moved to live-inbox/processed/, on any error to
// live-inbox/failed/ — the move is what marks a file done (idempotent, crash-safe).
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { parseSnapshot } from "../src/lib/server/live/schema";
import { ingestSnapshot } from "../src/lib/server/live/ingest";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run") || args.has("--dry");
const ONCE = args.has("--once");

const INBOX = path.resolve(process.env.LIVE_INBOX_DIR || path.join(process.cwd(), "live-inbox"));
const PROCESSED = path.join(INBOX, "processed");
const FAILED = path.join(INBOX, "failed");

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const ts = () => new Date().toISOString();
const log = (msg: string) => console.log(`[live ${ts()}] ${msg}`);

async function ensureDirs(): Promise<void> {
  await fs.mkdir(PROCESSED, { recursive: true });
  await fs.mkdir(FAILED, { recursive: true });
}

async function archive(file: string, dir: string): Promise<void> {
  if (DRY_RUN) return; // keep the file so a real run still picks it up
  const dest = path.join(dir, `${Date.now()}-${path.basename(file)}`);
  try {
    await fs.rename(file, dest);
  } catch (e) {
    log(`WARN could not archive ${path.basename(file)}: ${(e as Error).message}`);
  }
}

async function processFile(file: string): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return; // vanished (already moved by a concurrent event) — ignore
  }
  try {
    const snapshot = parseSnapshot(JSON.parse(raw));
    const sum = await ingestSnapshot(db, snapshot, { dryRun: DRY_RUN });
    const unresolved = sum.unresolved.map((u) => `${u.home}-${u.away}`).join(",") || "0";
    log(
      `ingested ${path.basename(file)} src=${sum.source} date=${sum.date} ` +
        `live=[${sum.liveUpdated.join(",")}] final=[${sum.finalized.join(",")}] ` +
        `skipFinal=${sum.skippedFinal.length} unresolved=${unresolved} ` +
        `recompute=${sum.recomputed} prov=${sum.provisionalRan}${DRY_RUN ? " (dry-run)" : ""}`,
    );
    if (sum.unresolved.length > 0) {
      log(`⚠ UNRESOLVED fixtures (add aliases): ${sum.unresolved.map((u) => `"${u.home} – ${u.away}"`).join(", ")}`);
    }
    await archive(file, PROCESSED);
  } catch (e) {
    log(`✗ FAILED ${path.basename(file)}: ${(e as Error).message}`);
    await archive(file, FAILED);
  }
}

async function drainBacklog(): Promise<void> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(INBOX)).filter((f) => f.endsWith(".json"));
  } catch {
    return;
  }
  entries.sort(); // oldest-first by filename (DATE-<capturedAt>)
  if (entries.length) log(`draining ${entries.length} backlog file(s)`);
  for (const f of entries) await processFile(path.join(INBOX, f));
}

async function main(): Promise<void> {
  await ensureDirs();
  log(`watching ${INBOX}${DRY_RUN ? " (dry-run)" : ""}${ONCE ? " (once)" : ""}`);
  await drainBacklog();
  if (ONCE) {
    log("backlog drained — exiting (--once)");
    process.exit(0);
  }
  const watcher = chokidar.watch(path.join(INBOX, "*.json"), {
    ignoreInitial: true, // backlog already drained above
    depth: 0, // never descend into processed/ or failed/
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 }, // no half-written reads
  });
  watcher.on("add", (file) => {
    void processFile(file);
  });
  watcher.on("error", (e) => log(`watcher error: ${(e as Error).message}`));
}

main().catch((e) => {
  console.error("watch-live failed to start:", e);
  process.exit(1);
});
