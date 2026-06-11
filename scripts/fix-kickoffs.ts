// One-off repair: the original seed stored placeholder kickoff slots (13:00,
// 15:00, …) because the schedule file carried no times — matches locked hours
// before the real kickoff. This re-reads data/grupna-faza.txt (which now has
// real Zagreb-time kickoffs) and updates ONLY `time` + `kickoff` on every
// non-final group-stage match. Mirrors scripts/crawl-results.ts: own Admin SDK
// handle from Application Default Credentials.
//
// Run with (Node 22):
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run fix:kickoffs -- --dry-run
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run fix:kickoffs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ddmmyyyyToIso, kickoffMs, clockTime } from "../src/lib/data/season";
import { COLLECTIONS } from "../src/lib/collections";
import type { MatchDoc } from "../src/lib/types";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);

const LINE_RE = /^(\d+)\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}(?:\+1)?)\s+([A-L])\s+(.+?)\s+–\s+(.+?)\s*$/;

function scheduleTimes(): Map<string, { time: string; kickoff: number }> {
  const file = join(process.cwd(), "data", "grupna-faza.txt");
  const out = new Map<string, { time: string; kickoff: number }>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const l = line.trim();
    if (!l) continue;
    const m = LINE_RE.exec(l);
    if (!m) throw new Error(`Cannot parse schedule line: "${l}"`);
    const [, no, date, time] = m;
    const iso = ddmmyyyyToIso(date);
    out.set(`m${no.padStart(3, "0")}`, { time: clockTime(time), kickoff: kickoffMs(iso, time) });
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dry");
  const times = scheduleTimes();
  const snap = await db.collection(COLLECTIONS.matches).get();
  const now = Date.now();

  let changed = 0;
  let unlocked = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    const m = doc.data() as MatchDoc;
    const t = times.get(m.id);
    if (!t) continue; // friendlies (t001..) keep their seeded kickoff
    if (m.status === "final") continue;
    if (m.time === t.time && m.kickoff === t.kickoff) continue;
    const wasLocked = now >= m.kickoff;
    const isLocked = now >= t.kickoff;
    if (wasLocked && !isLocked) unlocked++;
    console.log(
      `${m.id} ${m.home}-${m.away} (${m.date}): ${m.time} → ${t.time}` +
        ` | kickoff ${new Date(m.kickoff).toISOString()} → ${new Date(t.kickoff).toISOString()}` +
        (wasLocked !== isLocked ? ` | ${wasLocked ? "UNLOCKS" : "LOCKS"}` : ""),
    );
    changed++;
    if (!dryRun) batch.update(doc.ref, { time: t.time, kickoff: t.kickoff });
  }

  if (!dryRun && changed) await batch.commit();
  console.log(
    `${dryRun ? "[dry-run] would update" : "Updated"} ${changed} matches (${unlocked} unlock again).`,
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("fix-kickoffs failed:", e);
    process.exit(1);
  },
);
