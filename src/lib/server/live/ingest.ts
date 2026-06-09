// Apply a scraped live-score snapshot to Firestore. Dependency-injected (takes a
// Firestore handle), no `server-only`, so the standalone tsx watcher and the
// Next.js side share it — mirrors crawler.ts.
//
// Live entries → {liveRes, minute, status:'live'} (provisional points recomputed).
// Final entries → {res, status:'final'} + cleared live fields → runRecompute (the
// canonical, audited finals path). An already-final match is never overwritten; an
// upcoming / unknown-score fixture is ignored (never downgrades a live match).
import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { runRecompute } from "@/lib/server/recompute";
import { runProvisional } from "@/lib/server/live/provisional";
import { indexMatchesByDate, resolveMatchId } from "@/lib/server/live/resolve";
import type { Snapshot } from "@/lib/server/live/schema";
import type { MatchDoc } from "@/lib/types";

export interface IngestSummary {
  source: string;
  date: string;
  liveUpdated: string[]; // match ids set/updated to live this run
  finalized: string[]; // match ids newly set final this run
  skippedFinal: string[]; // resolved but already final (idempotent skip)
  unresolved: { home: string; away: string }[]; // fixtures we couldn't map
  recomputed: boolean; // ran runRecompute (finals)
  provisionalRan: boolean; // ran runProvisional (live)
  dryRun: boolean;
}

export async function ingestSnapshot(
  db: Firestore,
  snapshot: Snapshot,
  opts: { now?: number; dryRun?: boolean } = {},
): Promise<IngestSummary> {
  const now = opts.now ?? Date.now();
  const dryRun = opts.dryRun ?? false;

  const snap = await db.collection(COLLECTIONS.matches).get();
  const matches = snap.docs.map((d) => d.data() as MatchDoc);
  const byId = new Map(matches.map((m) => [m.id, m]));
  const byDate = indexMatchesByDate(matches);

  const liveUpdated: string[] = [];
  const finalized: string[] = [];
  const skippedFinal: string[] = [];
  const unresolved: { home: string; away: string }[] = [];

  const bw = db.bulkWriter();

  for (const fx of snapshot.fixtures) {
    if (!fx.score) continue; // not started / unknown — nothing to write

    const id = resolveMatchId({ ...fx, date: snapshot.date }, byDate);
    if (!id) {
      unresolved.push({ home: fx.home, away: fx.away });
      continue;
    }
    const m = byId.get(id);
    if (!m || m.status === "final") {
      if (m) skippedFinal.push(id); // never overwrite an existing final
      continue;
    }

    if (fx.status === "final") {
      finalized.push(id);
      if (!dryRun) {
        bw.update(db.collection(COLLECTIONS.matches).doc(id), {
          res: [fx.score[0], fx.score[1]],
          status: "final",
          liveRes: null,
          minute: null,
          liveUpdatedAt: null,
        });
      }
    } else if (fx.status === "live") {
      liveUpdated.push(id);
      if (!dryRun) {
        bw.update(db.collection(COLLECTIONS.matches).doc(id), {
          liveRes: [fx.score[0], fx.score[1]],
          minute: fx.minute ?? null,
          status: "live",
          liveUpdatedAt: now,
        });
      }
    }
    // status === "upcoming" with a score is ignored (don't downgrade a live match)
  }

  if (!dryRun) await bw.close();

  // Finals first (authoritative totals), then provisional (reads fresh totals).
  let recomputed = false;
  let provisionalRan = false;
  if (!dryRun && finalized.length > 0) {
    await runRecompute(db);
    recomputed = true;
  }
  if (!dryRun && (liveUpdated.length > 0 || finalized.length > 0)) {
    await runProvisional(db);
    provisionalRan = true;
  }

  return {
    source: snapshot.source,
    date: snapshot.date,
    liveUpdated,
    finalized,
    skippedFinal,
    unresolved,
    recomputed,
    provisionalRan,
    dryRun,
  };
}
