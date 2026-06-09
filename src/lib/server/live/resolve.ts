// Resolve a scraped snapshot fixture (team NAMES, by date) to one of our match ids.
// Pure (no firebase): reuses the same date + team-alias matching the finals crawler
// uses, but works off an in-memory matchesByDate index the watcher builds once.
import type { MatchDoc } from "@/lib/types";
import { nameMatchesCode } from "@/lib/server/results-crawler/team-aliases";

export interface ResolvableFixture {
  home: string;
  away: string;
  homeCode?: string;
  awayCode?: string;
  date: string; // 'YYYY-MM-DD'
}

/** Does `name` (with optional explicit code) refer to our `code`? Code wins if given. */
function sideMatches(code: string, name: string, explicitCode?: string): boolean {
  if (explicitCode) return explicitCode.toUpperCase() === code.toUpperCase();
  return nameMatchesCode(code, name);
}

/** Index matches by their fixture date — the candidate set for a snapshot day. */
export function indexMatchesByDate(matches: MatchDoc[]): Map<string, MatchDoc[]> {
  const byDate = new Map<string, MatchDoc[]>();
  for (const m of matches) {
    const list = byDate.get(m.date);
    if (list) list.push(m);
    else byDate.set(m.date, [m]);
  }
  return byDate;
}

/**
 * Resolve a fixture to a single match id. Requires BOTH teams to match the SAME
 * same-date candidate in the SAME home/away orientation (so a swapped listing —
 * whose score would also be reversed — fails closed rather than corrupting a
 * result). Returns null if zero or more than one candidate matches (ambiguous);
 * the caller logs it as unresolved and never guesses.
 */
export function resolveMatchId(
  fx: ResolvableFixture,
  matchesByDate: Map<string, MatchDoc[]>,
): string | null {
  const candidates = matchesByDate.get(fx.date) ?? [];
  const hits = candidates.filter(
    (m) =>
      sideMatches(m.home, fx.home, fx.homeCode) &&
      sideMatches(m.away, fx.away, fx.awayCode),
  );
  return hits.length === 1 ? hits[0].id : null;
}
