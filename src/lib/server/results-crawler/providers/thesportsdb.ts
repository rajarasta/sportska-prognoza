// TheSportsDB results provider (https://www.thesportsdb.com).
// Free tier: the public test key "123" works for the v1 endpoints. Set a real key
// via RESULTS_API_KEY for higher rate limits. Covers international friendlies, so
// the pre-WC trial games are resolvable here.
//
// Strategy: fetch one "events on day" page per distinct fixture date, then match
// each of our fixtures to an event by date + both team names (via team-aliases).
import type { DueMatch, ResultsProvider, Scoreline } from "@/lib/server/results-crawler/types";
import { nameMatchesCode } from "@/lib/server/results-crawler/team-aliases";

interface SportsDbEvent {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  dateEvent?: string | null;
}

const FINISHED = new Set(["match finished", "ft", "aet", "finished", "after extra time", "pen", "pen."]);
const NOT_FINISHED = new Set([
  "not started", "ns", "tbd", "postponed", "pp", "cancelled", "canceled",
  "abandoned", "live", "1h", "2h", "ht", "halftime", "half time",
]);

function parsedScore(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

function isFinished(ev: SportsDbEvent): boolean {
  const hs = parsedScore(ev.intHomeScore);
  const as = parsedScore(ev.intAwayScore);
  if (hs == null || as == null) return false;
  const st = (ev.strStatus ?? "").toString().trim().toLowerCase();
  if (FINISHED.has(st)) return true;
  // Some feeds leave the status blank once a game is over — accept scores then,
  // but never when the status explicitly says scheduled/live.
  return !NOT_FINISHED.has(st);
}

export class TheSportsDbProvider implements ResultsProvider {
  readonly name = "thesportsdb";
  private readonly key: string;
  private readonly base: string;

  constructor(key = process.env.RESULTS_API_KEY || "123") {
    this.key = key;
    this.base = `https://www.thesportsdb.com/api/v1/json/${this.key}`;
  }

  private async eventsOnDay(date: string): Promise<SportsDbEvent[]> {
    const url = `${this.base}/eventsday.php?d=${encodeURIComponent(date)}&s=Soccer`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`TheSportsDB ${res.status} for ${date}`);
    const json = (await res.json()) as { events?: SportsDbEvent[] | null };
    return json.events ?? [];
  }

  async fetchFinals(due: DueMatch[]): Promise<Map<string, Scoreline>> {
    const out = new Map<string, Scoreline>();
    if (due.length === 0) return out;

    const dates = [...new Set(due.map((m) => m.date))];
    const byDate = new Map<string, SportsDbEvent[]>();
    await Promise.all(
      dates.map(async (d) => {
        try {
          byDate.set(d, await this.eventsOnDay(d));
        } catch {
          byDate.set(d, []); // a failed date shouldn't sink the others
        }
      }),
    );

    for (const m of due) {
      const events = byDate.get(m.date) ?? [];
      const ev = events.find(
        (e) =>
          isFinished(e) &&
          nameMatchesCode(m.home, e.strHomeTeam ?? "") &&
          nameMatchesCode(m.away, e.strAwayTeam ?? ""),
      );
      if (!ev) continue;
      const hs = parsedScore(ev.intHomeScore);
      const as = parsedScore(ev.intAwayScore);
      if (hs == null || as == null) continue;
      out.set(m.id, [hs, as]);
    }
    return out;
  }
}
