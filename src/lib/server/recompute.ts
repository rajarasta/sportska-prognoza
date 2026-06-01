// Dependency-injected score recompute — the single source of truth for derived
// data (prediction points, duel resolution, per-user aggregates, ranking).
//
// This module is deliberately NOT `server-only`: it imports only the pure
// scoring/duel helpers and operates on a Firestore handle passed in by the
// caller. That lets BOTH the Next.js server (via scoring-engine.ts, which passes
// `adminDb`) AND a standalone tsx CLI (which builds its own Firestore handle)
// reuse the exact same logic without tripping the `server-only` barrier that
// `@/lib/firebase/admin` raises.
import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS, CONFIG_DOC_ID } from "@/lib/collections";
import { scorePick, isExact, DEFAULT_SCORE_CONFIG, type ScoreConfig } from "@/lib/scoring";
import { resolveDuel } from "@/lib/duels";
import type { DuelDoc, LeagueConfigDoc, MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

function scoreConfigFrom(cfg: LeagueConfigDoc | null): ScoreConfig {
  if (!cfg) return DEFAULT_SCORE_CONFIG;
  return { sigma: cfg.sigma, exactPoints: cfg.exactPoints, goalBonus: cfg.goalBonus };
}

/**
 * Full, idempotent recompute of all derived data from the source of truth
 * (matches + predictions + duels). Safe to run after any result change.
 *
 * Scoring model:
 *  • Base: each league prediction scores via scorePick → stored on `points`
 *    (drives the Gaussian breakdown for non-duel matches).
 *  • Duels override the participants' points for that match (double-or-nothing).
 *    The duel-adjusted per-match value is stored on `effectivePoints` and is what
 *    the user's total + history + others-list use.
 *  • Creation enforces at most one duel per player per match, so the override
 *    map never collides.
 */
export async function runRecompute(db: Firestore): Promise<void> {
  const cfgSnap = await db.collection(COLLECTIONS.config).doc(CONFIG_DOC_ID).get();
  const cfg = cfgSnap.exists ? (cfgSnap.data() as LeagueConfigDoc) : null;
  const sc = scoreConfigFrom(cfg);

  const [matchesSnap, predsSnap, duelsSnap, usersSnap] = await Promise.all([
    db.collection(COLLECTIONS.matches).get(),
    db.collection(COLLECTIONS.predictions).get(),
    db.collection(COLLECTIONS.duels).get(),
    db.collection(COLLECTIONS.users).get(),
  ]);

  const matches = matchesSnap.docs.map((d) => d.data() as MatchDoc);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const preds = predsSnap.docs.map((d) => d.data() as PredictionDoc);
  const duels = duelsSnap.docs.map((d) => d.data() as DuelDoc);
  const users = usersSnap.docs.map((d) => d.data() as UserDoc);

  const isFinal = (m: MatchDoc | undefined): m is MatchDoc & { res: [number, number] } =>
    !!m && m.status === "final" && !!m.res;

  const bw = db.bulkWriter();
  const key = (uid: string, matchId: string) => `${uid}|${matchId}`;

  // 1. base prediction scoring (compute now, write after duel overrides are known)
  const basePoints = new Map<string, number>();
  type PredMeta = { id: string; uid: string; matchId: string; points: number | null; exact: boolean | null };
  const predMeta: PredMeta[] = preds.map((p) => {
    const m = matchById.get(p.matchId);
    if (isFinal(m)) {
      const r = scorePick(p.pick, m.res, sc);
      basePoints.set(key(p.uid, p.matchId), r.total);
      return { id: p.id, uid: p.uid, matchId: p.matchId, points: r.total, exact: r.exact };
    }
    return { id: p.id, uid: p.uid, matchId: p.matchId, points: null, exact: null };
  });

  // 2. duel resolution → override participant match points
  const override = new Map<string, number>();
  const won = new Map<string, number>();
  const lost = new Map<string, number>();
  for (const d of duels) {
    const m = matchById.get(d.matchId);
    if (isFinal(m)) {
      const out = resolveDuel(d.challengerPick, d.opponentPick, m.res, sc);
      override.set(key(d.challengerUid, d.matchId), out.challengerPoints);
      override.set(key(d.opponentUid, d.matchId), out.opponentPoints);
      const winnerUid =
        out.winner === "challenger" ? d.challengerUid : out.winner === "opponent" ? d.opponentUid : null;
      if (winnerUid) {
        won.set(winnerUid, (won.get(winnerUid) ?? 0) + 1);
        const loserUid = winnerUid === d.challengerUid ? d.opponentUid : d.challengerUid;
        lost.set(loserUid, (lost.get(loserUid) ?? 0) + 1);
      }
      bw.update(db.collection(COLLECTIONS.duels).doc(d.id), {
        status: "resolved",
        winnerUid,
        resolvedAt: Date.now(),
      });
    } else {
      bw.update(db.collection(COLLECTIONS.duels).doc(d.id), {
        status: "active",
        winnerUid: null,
        resolvedAt: null,
      });
    }
  }

  // 1b. write predictions with base points + duel-adjusted effectivePoints
  for (const pm of predMeta) {
    const k = key(pm.uid, pm.matchId);
    const effective = pm.points == null ? null : override.has(k) ? override.get(k)! : pm.points;
    bw.update(db.collection(COLLECTIONS.predictions).doc(pm.id), {
      points: pm.points,
      exact: pm.exact,
      effectivePoints: effective,
    });
  }

  // 3. per-user aggregates (effective per-match points = override ?? base)
  type Agg = { total: number; weekly: Record<string, number>; exact: number };
  const agg = new Map<string, Agg>();
  const ensure = (uid: string): Agg => {
    let a = agg.get(uid);
    if (!a) {
      a = { total: 0, weekly: {}, exact: 0 };
      agg.set(uid, a);
    }
    return a;
  };

  for (const k of new Set([...basePoints.keys(), ...override.keys()])) {
    const [uid, matchId] = k.split("|");
    const m = matchById.get(matchId);
    if (!m) continue;
    const pts = override.has(k) ? override.get(k)! : basePoints.get(k)!;
    const a = ensure(uid);
    a.total += pts;
    a.weekly[m.week] = (a.weekly[m.week] ?? 0) + pts;
  }
  for (const p of preds) {
    const m = matchById.get(p.matchId);
    if (isFinal(m) && isExact(p.pick, m.res)) ensure(p.uid).exact += 1;
  }

  // 4. ranking
  const ranked = users
    .map((u) => ({ uid: u.uid, total: round2(agg.get(u.uid)?.total ?? 0), exact: agg.get(u.uid)?.exact ?? 0 }))
    .sort((a, b) => b.total - a.total || b.exact - a.exact);
  const rankByUid = new Map<string, number>();
  ranked.forEach((r, i) => rankByUid.set(r.uid, i + 1));

  // 5. write user aggregates
  for (const u of users) {
    const a = agg.get(u.uid);
    const weekly: Record<string, number> = {};
    let best = 0;
    for (const [w, v] of Object.entries(a?.weekly ?? {})) {
      const rv = round2(v);
      weekly[w] = rv;
      best = Math.max(best, rv);
    }
    const newRank = rankByUid.get(u.uid) ?? null;
    const oldRank = u.rank ?? null;
    // Only advance prevRank when the rank actually changed, so a redundant
    // recompute (e.g. re-saving the same result) doesn't blank the movement arrow.
    const prevRank = newRank === oldRank ? (u.prevRank ?? null) : oldRank;
    bw.update(db.collection(COLLECTIONS.users).doc(u.uid), {
      totalPoints: round2(a?.total ?? 0),
      weeklyPoints: weekly,
      bestWeekPoints: round2(best),
      exactCount: a?.exact ?? 0,
      duelsWon: won.get(u.uid) ?? 0,
      duelsLost: lost.get(u.uid) ?? 0,
      prevRank,
      rank: newRank,
    });
  }

  await bw.close();
}
