// Provisional ("possible points") scoring for LIVE matches. Deliberately kept
// separate from runRecompute so the audited finals engine (points / effectivePoints
// / totalPoints / ranks / duels) is never touched by the volatile live path.
//
// Dependency-injected (takes a Firestore handle), no `server-only`: runs from both
// the Next.js side and the standalone tsx watcher, like recompute.ts / crawler.ts.
//
// Model: provPoints = scorePick(pick, liveRes) for predictions whose match is
// currently live; per-user provTotalPoints = authoritative totalPoints + Σ live
// provPoints. Duels are NOT applied provisionally (a duel isn't won until final);
// the final runRecompute applies the real 2× duel math and supersedes this.
import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS, CONFIG_DOC_ID } from "@/lib/collections";
import { scorePick, DEFAULT_SCORE_CONFIG, type ScoreConfig } from "@/lib/scoring";
import type { LeagueConfigDoc, MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

function scoreConfigFrom(cfg: LeagueConfigDoc | null): ScoreConfig {
  if (!cfg) return DEFAULT_SCORE_CONFIG;
  return { sigma: cfg.sigma, exactPoints: cfg.exactPoints, goalBonus: cfg.goalBonus };
}

function isLive(m: MatchDoc | undefined): m is MatchDoc & { liveRes: [number, number] } {
  return !!m && m.status === "live" && Array.isArray(m.liveRes) && m.liveRes.length === 2;
}

/**
 * Idempotent provisional recompute. For every prediction it writes `provPoints`
 * (the possible points vs the current live score, or null when its match isn't
 * live — which also clears stale provisional values once a match finalizes), and
 * for every user it writes `provTotalPoints` / `provWeeklyPoints`.
 */
export async function runProvisional(db: Firestore): Promise<void> {
  const cfgSnap = await db.collection(COLLECTIONS.config).doc(CONFIG_DOC_ID).get();
  const cfg = cfgSnap.exists ? (cfgSnap.data() as LeagueConfigDoc) : null;
  const sc = scoreConfigFrom(cfg);

  const [matchesSnap, predsSnap, usersSnap] = await Promise.all([
    db.collection(COLLECTIONS.matches).get(),
    db.collection(COLLECTIONS.predictions).get(),
    db.collection(COLLECTIONS.users).get(),
  ]);

  const matchById = new Map(matchesSnap.docs.map((d) => [d.id, d.data() as MatchDoc]));
  const preds = predsSnap.docs.map((d) => d.data() as PredictionDoc);
  const users = usersSnap.docs.map((d) => d.data() as UserDoc);

  const bw = db.bulkWriter();

  // 1. per-prediction provisional points (null when the match isn't live)
  type LiveContribution = { uid: string; week: number; pts: number };
  const live: LiveContribution[] = [];
  for (const p of preds) {
    const m = matchById.get(p.matchId);
    const prov = isLive(m) ? scorePick(p.pick, m.liveRes, sc).total : null;
    if (prov != null && m) live.push({ uid: p.uid, week: m.week, pts: prov });
    bw.update(db.collection(COLLECTIONS.predictions).doc(p.id), { provPoints: prov });
  }

  // 2. per-user provisional totals = authoritative final totals + live contributions
  const addByUid = new Map<string, { total: number; weekly: Record<string, number> }>();
  const ensure = (uid: string) => {
    let a = addByUid.get(uid);
    if (!a) {
      a = { total: 0, weekly: {} };
      addByUid.set(uid, a);
    }
    return a;
  };
  for (const c of live) {
    const a = ensure(c.uid);
    a.total += c.pts;
    a.weekly[c.week] = (a.weekly[c.week] ?? 0) + c.pts;
  }

  for (const u of users) {
    const add = addByUid.get(u.uid);
    const baseWeekly = u.weeklyPoints ?? {};
    const provWeekly: Record<string, number> = {};
    const weekKeys = new Set([...Object.keys(baseWeekly), ...Object.keys(add?.weekly ?? {})]);
    for (const w of weekKeys) {
      provWeekly[w] = round2((baseWeekly[w] ?? 0) + (add?.weekly[w] ?? 0));
    }
    bw.update(db.collection(COLLECTIONS.users).doc(u.uid), {
      provTotalPoints: round2((u.totalPoints ?? 0) + (add?.total ?? 0)),
      provWeeklyPoints: provWeekly,
    });
  }

  await bw.close();
}
