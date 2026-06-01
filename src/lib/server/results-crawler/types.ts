// Results-crawler contracts. Pure (no `server-only`, no firebase) so both the
// Next.js cron route and the standalone tsx CLI can import them.
import type { Scoreline } from "@/lib/types";

/** A fixture the crawler may try to resolve a final score for. */
export interface DueMatch {
  id: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  home: string; // team code
  away: string; // team code
  friendly?: boolean;
}

/**
 * A source of finished-match results. Implementations return scorelines for
 * whichever of the supplied matches they can resolve (and only matches that are
 * actually finished) — keyed by our match id. Unresolved matches are simply
 * omitted.
 */
export interface ResultsProvider {
  readonly name: string;
  fetchFinals(due: DueMatch[]): Promise<Map<string, Scoreline>>;
}

export type { Scoreline };
