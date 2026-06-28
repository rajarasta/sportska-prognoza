import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, CONFIG_DOC_ID, predictionId } from "@/lib/collections";
import {
  scorePick,
  isExact,
  DEFAULT_SCORE_CONFIG,
  M2_EXACT_POINTS,
  type M2PredictionScoreBreakdown,
  type ScoreConfig,
} from "@/lib/scoring";
import { scoreDuelParticipantForMatchM2, scorePredictionForMatchM2 } from "@/lib/m2";
import { applyNickname } from "@/lib/data/nicknames";
import type {
  DuelDoc,
  LeagueConfigDoc,
  MatchDoc,
  MatchWinner,
  PredictionDoc,
  Scoreline,
  UserDoc,
} from "@/lib/types";

// ── Config ──
export async function getConfig(): Promise<LeagueConfigDoc | null> {
  const snap = await adminDb.collection(COLLECTIONS.config).doc(CONFIG_DOC_ID).get();
  return snap.exists ? (snap.data() as LeagueConfigDoc) : null;
}

export function scoreConfigFrom(cfg: LeagueConfigDoc | null): ScoreConfig {
  if (!cfg) return DEFAULT_SCORE_CONFIG;
  return { sigma: cfg.sigma, exactPoints: cfg.exactPoints, goalBonus: cfg.goalBonus };
}

// ── Users / leaderboard ──
export interface Standing {
  uid: string;
  name: string;
  init: string;
  color: string;
  you: boolean;
  points: number;
  weeklyPoints: Record<string, number>;
  m2Points: number;
  m2WeeklyPoints: Record<string, number>;
  m2Rank: number;
  m2Move: number;
  exact: number;
  move: number; // prevRank - rank (positive = climbed)
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await adminDb.collection(COLLECTIONS.users).get();
  return snap.docs.map((d) => applyNickname(d.data() as UserDoc));
}

export async function getUsersMap(): Promise<Map<string, UserDoc>> {
  const users = await getAllUsers();
  return new Map(users.map((u) => [u.uid, u]));
}

type M2StandingValues = {
  points: number;
  weeklyPoints: Record<string, number>;
  rank: number;
  move: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const standingKey = (uid: string, matchId: string) => `${uid}|${matchId}`;
const isCountingFinal = (m: MatchDoc | undefined): m is MatchDoc & { res: Scoreline } =>
  Boolean(m && m.status === "final" && m.res && !m.friendly);

function m2BaseForPrediction(p: PredictionDoc, m: MatchDoc): number | null {
  if (p.m2Points != null) return p.m2Points;
  if (isCountingFinal(m)) return scorePredictionForMatchM2(p, m).total;
  if (m.status === "final" && m.res) return 0;
  return null;
}

function m2EffectiveForPrediction(
  p: PredictionDoc,
  m: MatchDoc,
  duel?: DuelDoc | null,
): number | null {
  if (p.m2EffectivePoints != null) return p.m2EffectivePoints;
  if (!isCountingFinal(m)) {
    if (m.status === "final" && m.res) return 0;
    return null;
  }
  if (!duel) return m2BaseForPrediction(p, m);

  const challengerExact = isExact(duel.challengerPick, m.res);
  const opponentExact = isExact(duel.opponentPick, m.res);
  const isChallenger = p.uid === duel.challengerUid;
  if (challengerExact) return isChallenger ? 2 * M2_EXACT_POINTS : 0;
  if (opponentExact) return isChallenger ? 0 : 2 * M2_EXACT_POINTS;
  return scoreDuelParticipantForMatchM2(duel, m, isChallenger ? "challenger" : "opponent").total;
}

async function computeM2StandingsFallback(users: UserDoc[]): Promise<Map<string, M2StandingValues>> {
  const [matchesSnap, predsSnap, duelsSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.matches).get(),
    adminDb.collection(COLLECTIONS.predictions).get(),
    adminDb.collection(COLLECTIONS.duels).get(),
  ]);
  const matches = matchesSnap.docs.map((d) => d.data() as MatchDoc);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const preds = predsSnap.docs.map((d) => d.data() as PredictionDoc);
  const duels = duelsSnap.docs.map((d) => d.data() as DuelDoc);
  const counts = (m: MatchDoc | undefined): m is MatchDoc & { res: Scoreline } =>
    Boolean(m && m.status === "final" && m.res && !m.friendly);

  const base = new Map<string, number>();
  for (const p of preds) {
    const m = matchById.get(p.matchId);
    if (!counts(m)) continue;
    base.set(standingKey(p.uid, p.matchId), scorePredictionForMatchM2(p, m).total);
  }

  const override = new Map<string, number>();
  for (const d of duels) {
    const m = matchById.get(d.matchId);
    if (!counts(m)) continue;
    const challengerKey = standingKey(d.challengerUid, d.matchId);
    const opponentKey = standingKey(d.opponentUid, d.matchId);
    if (isExact(d.challengerPick, m.res)) {
      override.set(challengerKey, 2 * M2_EXACT_POINTS);
      override.set(opponentKey, 0);
    } else if (isExact(d.opponentPick, m.res)) {
      override.set(challengerKey, 0);
      override.set(opponentKey, 2 * M2_EXACT_POINTS);
    } else {
      override.set(challengerKey, scoreDuelParticipantForMatchM2(d, m, "challenger").total);
      override.set(opponentKey, scoreDuelParticipantForMatchM2(d, m, "opponent").total);
    }
  }

  type Agg = { points: number; weeklyPoints: Record<string, number> };
  const agg = new Map<string, Agg>();
  const ensure = (uid: string): Agg => {
    let row = agg.get(uid);
    if (!row) {
      row = { points: 0, weeklyPoints: {} };
      agg.set(uid, row);
    }
    return row;
  };
  users.forEach((u) => ensure(u.uid));

  for (const k of new Set([...base.keys(), ...override.keys()])) {
    const [uid, matchId] = k.split("|");
    const m = matchById.get(matchId);
    if (!m) continue;
    const pts = override.has(k) ? override.get(k)! : base.get(k)!;
    const row = ensure(uid);
    row.points += pts;
    row.weeklyPoints[m.week] = (row.weeklyPoints[m.week] ?? 0) + pts;
  }

  const ranked = users
    .map((u) => ({ uid: u.uid, points: round2(agg.get(u.uid)?.points ?? 0), exact: u.exactCount }))
    .sort((a, b) => b.points - a.points || b.exact - a.exact);
  const rankByUid = new Map(ranked.map((r, i) => [r.uid, i + 1]));

  return new Map(
    users.map((u) => {
      const row = agg.get(u.uid);
      const weekly = Object.fromEntries(
        Object.entries(row?.weeklyPoints ?? {}).map(([week, points]) => [week, round2(points)]),
      );
      return [
        u.uid,
        {
          points: round2(row?.points ?? 0),
          weeklyPoints: weekly,
          rank: rankByUid.get(u.uid) ?? 0,
          move: 0,
        },
      ];
    }),
  );
}

export async function getLeaderboard(meUid: string): Promise<Standing[]> {
  const users = await getAllUsers();
  const hasStoredM2 = users.some((u) => u.m2TotalPoints != null);
  const fallbackM2 = hasStoredM2 ? null : await computeM2StandingsFallback(users);
  const m2Ranked = hasStoredM2
    ? [...users].sort((a, b) => (b.m2TotalPoints ?? 0) - (a.m2TotalPoints ?? 0) || b.exactCount - a.exactCount)
    : [];
  const m2RankByUid = new Map(m2Ranked.map((u, i) => [u.uid, i + 1]));
  users.sort((a, b) => b.totalPoints - a.totalPoints || b.exactCount - a.exactCount);
  return users.map((u, i) => {
    const rank = i + 1;
    const move = u.prevRank ? u.prevRank - rank : 0;
    const fallback = fallbackM2?.get(u.uid);
    const m2Rank = fallback?.rank ?? m2RankByUid.get(u.uid) ?? 0;
    const m2Move = fallback?.move ?? (u.m2PrevRank && m2Rank ? u.m2PrevRank - m2Rank : 0);
    return {
      uid: u.uid,
      name: u.name,
      init: u.init,
      color: u.color,
      you: u.uid === meUid,
      points: u.totalPoints,
      weeklyPoints: u.weeklyPoints ?? {},
      m2Points: fallback?.points ?? u.m2TotalPoints ?? 0,
      m2WeeklyPoints: fallback?.weeklyPoints ?? u.m2WeeklyPoints ?? {},
      m2Rank,
      m2Move,
      exact: u.exactCount,
      move,
    };
  });
}

// ── Matches + my picks ──
export async function getAllMatches(): Promise<MatchDoc[]> {
  const snap = await adminDb.collection(COLLECTIONS.matches).orderBy("kickoff").get();
  return snap.docs.map((d) => d.data() as MatchDoc);
}

export async function getMyPredictions(uid: string): Promise<Map<string, PredictionDoc>> {
  const snap = await adminDb
    .collection(COLLECTIONS.predictions)
    .where("uid", "==", uid)
    .get();
  const map = new Map<string, PredictionDoc>();
  snap.docs.forEach((d) => {
    const p = d.data() as PredictionDoc;
    map.set(p.matchId, p);
  });
  return map;
}

/** A match enriched with the current user's pick + earned points (for cards). */
export interface MatchView extends MatchDoc {
  myPick: Scoreline | null;
  myExtraTimePick: Scoreline | null;
  myPenaltyWinnerPick: MatchWinner | null;
  myPenaltyPick: Scoreline | null;
  earned: number | null;
  m2Earned: number | null;
}

export async function getMatchViews(uid: string): Promise<MatchView[]> {
  const [matches, mine, duels] = await Promise.all([getAllMatches(), getMyPredictions(uid), getMyDuels(uid)]);
  const duelByMatch = new Map(duels.map((d) => [d.matchId, d]));
  return matches.map((m) => {
    const p = mine.get(m.id);
    return {
      ...m,
      myPick: p?.pick ?? null,
      myExtraTimePick: p?.extraTimePick ?? null,
      myPenaltyWinnerPick: p?.penaltyWinnerPick ?? null,
      myPenaltyPick: p?.penaltyPick ?? null,
      earned: p ? p.effectivePoints ?? p.points ?? null : null,
      m2Earned: p ? m2EffectiveForPrediction(p, m, duelByMatch.get(m.id)) : null,
    };
  });
}

export async function getMatch(id: string): Promise<MatchDoc | null> {
  const snap = await adminDb.collection(COLLECTIONS.matches).doc(id).get();
  return snap.exists ? (snap.data() as MatchDoc) : null;
}

export async function getMyPick(uid: string, matchId: string): Promise<PredictionDoc | null> {
  const snap = await adminDb
    .collection(COLLECTIONS.predictions)
    .doc(predictionId(matchId, uid))
    .get();
  return snap.exists ? (snap.data() as PredictionDoc) : null;
}

export interface OtherPick {
  uid: string;
  name: string;
  init: string;
  color: string;
  pick: Scoreline;
  extraTimePick: Scoreline | null;
  penaltyWinnerPick: MatchWinner | null;
  penaltyPick: Scoreline | null;
  points: number | null;
  m2Points: number | null;
}

/** Whether the match has already kicked off / finished. */
export function isLocked(m: MatchDoc, now = Date.now()): boolean {
  return m.status === "final" || m.status === "live" || now >= m.kickoff;
}

export interface MyDuelResult {
  points: number; // duel-adjusted points I earned on this match
  m2Points: number;
  decided: boolean; // someone hit exact (a clear winner); else both-miss normal scoring
  won: boolean;
  opponentName: string;
}

export interface MatchDetailData {
  match: MatchDoc;
  myPick: PredictionDoc | null;
  others: OtherPick[];
  revealOthers: boolean; // peek-prevention: only after I've tipped, or once final
  breakdown: ReturnType<typeof scorePick> | null; // null when a duel decided my points
  m2Breakdown: M2PredictionScoreBreakdown | null;
  myDuel: MyDuelResult | null;
}

export async function getMatchDetail(id: string, uid: string): Promise<MatchDetailData | null> {
  const match = await getMatch(id);
  if (!match) return null;
  const [myPick, predsSnap, usersMap, cfg, duelsSnap] = await Promise.all([
    getMyPick(uid, id),
    adminDb.collection(COLLECTIONS.predictions).where("matchId", "==", id).get(),
    getUsersMap(),
    getConfig(),
    adminDb.collection(COLLECTIONS.duels).where("matchId", "==", id).get(),
  ]);

  const isFinal = match.status === "final" && match.res;
  // Peek-prevention: reveal others only once I've committed my own pick, or final.
  const revealOthers = Boolean(isFinal || myPick);
  const duelDocs = duelsSnap.docs.map((d) => d.data() as DuelDoc);

  const others: OtherPick[] = revealOthers
    ? predsSnap.docs
        .map((d) => d.data() as PredictionDoc)
        .filter((p) => p.uid !== uid)
        .map((p) => {
          const u = usersMap.get(p.uid);
          const duel = duelDocs.find((d) => d.challengerUid === p.uid || d.opponentUid === p.uid);
          // duel-adjusted contribution (falls back to base for non-duel matches)
          const points = p.effectivePoints ?? p.points ?? null;
          return {
            uid: p.uid,
            name: u?.name ?? "Igrač",
            init: u?.init ?? "?",
            color: u?.color ?? "#888",
            pick: p.pick,
            extraTimePick: p.extraTimePick ?? null,
            penaltyWinnerPick: p.penaltyWinnerPick ?? null,
            penaltyPick: p.penaltyPick ?? null,
            points,
            m2Points: m2EffectiveForPrediction(p, match, duel),
          };
        })
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name))
    : [];

  // Was I in a (resolved) duel on this match? If so, the duel — not the Gaussian
  // breakdown — decided my points.
  const myDuelDoc = duelDocs.find((d) => d.challengerUid === uid || d.opponentUid === uid);
  let myDuel: MyDuelResult | null = null;
  if (isFinal && myPick && myDuelDoc) {
    const oppUid = myDuelDoc.challengerUid === uid ? myDuelDoc.opponentUid : myDuelDoc.challengerUid;
    myDuel = {
      points: myPick.effectivePoints ?? myPick.points ?? 0,
      m2Points: m2EffectiveForPrediction(myPick, match, myDuelDoc) ?? 0,
      decided: myDuelDoc.winnerUid != null,
      won: myDuelDoc.winnerUid === uid,
      opponentName: usersMap.get(oppUid)?.name ?? "protivnik",
    };
  }

  // Friendlies (Probni krug) award no points, so don't show a points breakdown.
  const breakdown =
    isFinal && myPick && !myDuel && !match.friendly
      ? scorePick(myPick.pick, match.res as Scoreline, scoreConfigFrom(cfg))
      : null;
  const m2Breakdown =
    isFinal && myPick && !myDuel && !match.friendly
      ? scorePredictionForMatchM2(myPick, match as MatchDoc & { res: Scoreline })
      : null;

  return { match, myPick, others, revealOthers, breakdown, m2Breakdown, myDuel };
}

// ── Profile ──
export interface HistoryRow {
  matchId: string;
  home: string;
  away: string;
  res: Scoreline;
  extraTimeRes: Scoreline | null;
  penaltyRes: Scoreline | null;
  winner: MatchWinner | null;
  pick: Scoreline;
  extraTimePick: Scoreline | null;
  penaltyWinnerPick: MatchWinner | null;
  penaltyPick: Scoreline | null;
  earned: number;
  m2Earned: number;
}

export async function getMyHistory(uid: string): Promise<HistoryRow[]> {
  const [matches, mine, duels] = await Promise.all([getAllMatches(), getMyPredictions(uid), getMyDuels(uid)]);
  const duelByMatch = new Map(duels.map((d) => [d.matchId, d]));
  const rows: HistoryRow[] = [];
  for (const m of matches) {
    if (m.status !== "final" || !m.res) continue;
    const p = mine.get(m.id);
    if (!p) continue;
    rows.push({
      matchId: m.id,
      home: m.home,
      away: m.away,
      res: m.res,
      extraTimeRes: m.extraTimeRes ?? null,
      penaltyRes: m.penaltyRes ?? null,
      winner: m.winner ?? null,
      pick: p.pick,
      extraTimePick: p.extraTimePick ?? null,
      penaltyWinnerPick: p.penaltyWinnerPick ?? null,
      penaltyPick: p.penaltyPick ?? null,
      earned: p.effectivePoints ?? p.points ?? 0,
      m2Earned: m2EffectiveForPrediction(p, m, duelByMatch.get(m.id)) ?? 0,
    });
  }
  // most recent first
  return rows.reverse();
}

// ── Player profile (another player's predictions) ──
export interface PlayerMatchRow {
  matchId: string;
  week: number;
  group: string;
  friendly: boolean;
  home: string;
  away: string;
  date: string;
  kickoff: number;
  status: MatchDoc["status"];
  res: Scoreline | null;
  extraTimeRes: Scoreline | null;
  penaltyRes: Scoreline | null;
  winner: MatchWinner | null;
  revealed: boolean; // peek-prevention: can the viewer see this player's pick?
  locked: boolean; // kicked off / final
  pick: Scoreline | null; // only when revealed
  extraTimePick: Scoreline | null;
  penaltyWinnerPick: MatchWinner | null;
  penaltyPick: Scoreline | null;
  earned: number | null; // duel-adjusted points, only once final
  m2Earned: number | null;
  exact: boolean | null;
}

export interface PlayerProfileData {
  uid: string;
  name: string;
  init: string;
  color: string;
  you: boolean;
  rank: number;
  m2Rank: number;
  totalPoints: number;
  m2TotalPoints: number;
  exactCount: number;
  duelsWon: number;
  rows: PlayerMatchRow[]; // chronological
}

/**
 * Another player's predictions across all matches, with the same peek-prevention
 * as getMatchDetail: a pick is only revealed if the match is final, the viewer has
 * already tipped that match, or it's the viewer's own profile.
 */
export async function getPlayerProfile(
  targetUid: string,
  viewerUid: string,
): Promise<PlayerProfileData | null> {
  const [users, matches, targetPreds, viewerPreds, targetDuels] = await Promise.all([
    getAllUsers(),
    getAllMatches(),
    getMyPredictions(targetUid),
    getMyPredictions(viewerUid),
    getMyDuels(targetUid),
  ]);
  const target = users.find((u) => u.uid === targetUid);
  if (!target) return null;

  // Rank with the same tie-breaking as the leaderboard.
  const sorted = [...users].sort(
    (a, b) => b.totalPoints - a.totalPoints || b.exactCount - a.exactCount,
  );
  const rank = sorted.findIndex((u) => u.uid === targetUid) + 1;
  const hasStoredM2 = users.some((u) => u.m2TotalPoints != null);
  const fallbackM2 = hasStoredM2 ? null : await computeM2StandingsFallback(users);
  const m2Sorted = hasStoredM2
    ? [...users].sort((a, b) => (b.m2TotalPoints ?? 0) - (a.m2TotalPoints ?? 0) || b.exactCount - a.exactCount)
    : [];
  const m2Rank = fallbackM2?.get(targetUid)?.rank ?? m2Sorted.findIndex((u) => u.uid === targetUid) + 1;
  const m2TotalPoints = fallbackM2?.get(targetUid)?.points ?? target.m2TotalPoints ?? 0;

  const now = Date.now();
  const own = targetUid === viewerUid;
  const duelByMatch = new Map(targetDuels.map((d) => [d.matchId, d]));
  const rows: PlayerMatchRow[] = matches.map((m) => {
    const isFinal = m.status === "final" && Boolean(m.res);
    const revealed = isFinal || own || viewerPreds.has(m.id);
    const p = targetPreds.get(m.id);
    return {
      matchId: m.id,
      week: m.week,
      group: m.group,
      friendly: Boolean(m.friendly),
      home: m.home,
      away: m.away,
      date: m.date,
      kickoff: m.kickoff,
      status: m.status,
      res: m.res ?? null,
      extraTimeRes: m.extraTimeRes ?? null,
      penaltyRes: m.penaltyRes ?? null,
      winner: m.winner ?? null,
      revealed,
      locked: isLocked(m, now),
      pick: revealed ? p?.pick ?? null : null,
      extraTimePick: revealed ? p?.extraTimePick ?? null : null,
      penaltyWinnerPick: revealed ? p?.penaltyWinnerPick ?? null : null,
      penaltyPick: revealed ? p?.penaltyPick ?? null : null,
      earned: isFinal && p ? p.effectivePoints ?? p.points ?? 0 : null,
      m2Earned: isFinal && p ? m2EffectiveForPrediction(p, m, duelByMatch.get(m.id)) ?? 0 : null,
      exact: p?.exact ?? null,
    };
  });
  rows.sort((a, b) => a.kickoff - b.kickoff);

  return {
    uid: target.uid,
    name: target.name,
    init: target.init,
    color: target.color,
    you: own,
    rank,
    m2Rank: m2Rank || 0,
    totalPoints: target.totalPoints,
    m2TotalPoints,
    exactCount: target.exactCount,
    duelsWon: target.duelsWon ?? 0,
    rows,
  };
}

// ── Allowlist (admin) ──
export interface AllowlistEntry {
  email: string;
  addedAt: number;
  joined: boolean; // has logged in (has a user doc)
}

export async function getAllowlist(): Promise<AllowlistEntry[]> {
  const [snap, users] = await Promise.all([
    adminDb.collection(COLLECTIONS.allowlist).get(),
    getAllUsers(),
  ]);
  const joined = new Set(users.map((u) => u.email.toLowerCase()));
  return snap.docs
    .map((d) => {
      const a = d.data() as { email: string; addedAt: number };
      return { email: a.email, addedAt: a.addedAt, joined: joined.has(a.email.toLowerCase()) };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function getMyDuels(uid: string): Promise<DuelDoc[]> {
  const [asChallenger, asOpponent] = await Promise.all([
    adminDb.collection(COLLECTIONS.duels).where("challengerUid", "==", uid).get(),
    adminDb.collection(COLLECTIONS.duels).where("opponentUid", "==", uid).get(),
  ]);
  const map = new Map<string, DuelDoc>();
  [...asChallenger.docs, ...asOpponent.docs].forEach((d) => map.set(d.id, d.data() as DuelDoc));
  return [...map.values()];
}
