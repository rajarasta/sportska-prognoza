import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { scorePick, isExact } from "@/lib/scoring";
import { resolveDuel } from "@/lib/duels";
import { getConfig, scoreConfigFrom } from "@/lib/server/queries";
import type { DuelDoc, MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Full, idempotent recompute of all derived data from the source of truth
 * (matches + predictions + duels). Safe to run after any result change.
 *
 * Scoring model:
 *  • Base: each league prediction scores via scorePick (stored on the pred doc,
 *    shown in breakdowns/history).
 *  • Duels override the two participants' points for that match (double-or-nothing).
 *  • A player's total = sum of per-match points (duel-adjusted where applicable).
 */
export async function recomputeScores(): Promise<void> {
  const cfg = await getConfig();
  const sc = scoreConfigFrom(cfg);

  const [matchesSnap, predsSnap, duelsSnap, usersSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.matches).get(),
    adminDb.collection(COLLECTIONS.predictions).get(),
    adminDb.collection(COLLECTIONS.duels).get(),
    adminDb.collection(COLLECTIONS.users).get(),
  ]);

  const matches = matchesSnap.docs.map((d) => d.data() as MatchDoc);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const preds = predsSnap.docs.map((d) => d.data() as PredictionDoc);
  const duels = duelsSnap.docs.map((d) => d.data() as DuelDoc);
  const users = usersSnap.docs.map((d) => d.data() as UserDoc);

  const isFinal = (m: MatchDoc | undefined): m is MatchDoc & { res: [number, number] } =>
    !!m && m.status === "final" && !!m.res;

  const bw = adminDb.bulkWriter();
  const key = (uid: string, matchId: string) => `${uid}|${matchId}`;

  // 1. base prediction scoring
  const basePoints = new Map<string, number>();
  for (const p of preds) {
    const m = matchById.get(p.matchId);
    if (isFinal(m)) {
      const r = scorePick(p.pick, m.res, sc);
      basePoints.set(key(p.uid, p.matchId), r.total);
      bw.update(adminDb.collection(COLLECTIONS.predictions).doc(p.id), { points: r.total, exact: r.exact });
    } else {
      bw.update(adminDb.collection(COLLECTIONS.predictions).doc(p.id), { points: null, exact: null });
    }
  }

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
      bw.update(adminDb.collection(COLLECTIONS.duels).doc(d.id), {
        status: "resolved",
        winnerUid,
        resolvedAt: Date.now(),
      });
    } else {
      bw.update(adminDb.collection(COLLECTIONS.duels).doc(d.id), {
        status: "active",
        winnerUid: null,
        resolvedAt: null,
      });
    }
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
    bw.update(adminDb.collection(COLLECTIONS.users).doc(u.uid), {
      totalPoints: round2(a?.total ?? 0),
      weeklyPoints: weekly,
      bestWeekPoints: round2(best),
      exactCount: a?.exact ?? 0,
      duelsWon: won.get(u.uid) ?? 0,
      duelsLost: lost.get(u.uid) ?? 0,
      prevRank: u.rank ?? null,
      rank: rankByUid.get(u.uid) ?? null,
    });
  }

  await bw.close();
}
