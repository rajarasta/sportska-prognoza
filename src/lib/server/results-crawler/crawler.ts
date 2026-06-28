// Crawl + apply orchestration. Dependency-injected (takes a Firestore handle), so
// it runs from BOTH the Next.js cron route (passing `adminDb`) and the standalone
// tsx CLI (passing its own handle) — no `server-only` barrier.
import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { isKnockoutMatch } from "@/lib/matches";
import { runRecompute } from "@/lib/server/recompute";
import { selectProvider } from "@/lib/server/results-crawler/providers";
import type { DueMatch, ResultsProvider } from "@/lib/server/results-crawler/types";
import type { MatchDoc, Scoreline } from "@/lib/types";

export interface CrawlOptions {
  now?: number;
  /** Don't write anything — just report what would change. */
  dryRun?: boolean;
  /** Consider every not-yet-final match, even those whose kickoff hasn't passed. */
  force?: boolean;
  /** Override the provider (defaults to selectProvider() from RESULTS_PROVIDER). */
  provider?: ResultsProvider;
}

export interface CrawlUpdate {
  id: string;
  home: string;
  away: string;
  res: Scoreline;
}

export interface CrawlSummary {
  provider: string;
  dryRun: boolean;
  candidates: number; // not-final matches considered
  queried: number; // matches actually sent to the provider
  updated: CrawlUpdate[]; // matches set to final this run
  recomputed: boolean;
}

/**
 * Fetch finished results for due matches, mark them final (idempotently — already
 * final matches are skipped), and recompute scores once if anything changed.
 */
export async function crawlAndApply(db: Firestore, opts: CrawlOptions = {}): Promise<CrawlSummary> {
  const now = opts.now ?? Date.now();
  const dryRun = opts.dryRun ?? false;
  const provider = opts.provider ?? selectProvider();

  const snap = await db.collection(COLLECTIONS.matches).get();
  const matches = snap.docs.map((d) => d.data() as MatchDoc);
  const byId = new Map(matches.map((m) => [m.id, m]));

  const candidates = matches.filter((m) => !isKnockoutMatch(m) && m.status !== "final");
  const queryable = opts.force ? candidates : candidates.filter((m) => m.kickoff <= now);
  const due: DueMatch[] = queryable.map((m) => ({
    id: m.id,
    date: m.date,
    time: m.time,
    home: m.home,
    away: m.away,
    friendly: m.friendly,
  }));

  const finals = await provider.fetchFinals(due);

  const updated: CrawlUpdate[] = [];
  for (const [id, res] of finals) {
    const m = byId.get(id);
    if (!m || m.status === "final") continue; // never overwrite an existing final
    updated.push({ id, home: m.home, away: m.away, res });
    if (!dryRun) {
      await db.collection(COLLECTIONS.matches).doc(id).update({
        res: [res[0], res[1]],
        status: "final",
      });
    }
  }

  let recomputed = false;
  if (updated.length > 0 && !dryRun) {
    await runRecompute(db);
    recomputed = true;
  }

  return {
    provider: provider.name,
    dryRun,
    candidates: candidates.length,
    queried: due.length,
    updated,
    recomputed,
  };
}
