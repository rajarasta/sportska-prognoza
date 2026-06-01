import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, tokenBalanceId } from "@/lib/collections";
import {
  getAllMatches,
  getConfig,
  getMatch,
  getMyDuels,
  getMyPick,
  getUsersMap,
} from "@/lib/server/queries";
import type { DuelDoc, MatchDoc, PredictionDoc, Scoreline } from "@/lib/types";

export const DEFAULT_TOKENS_PER_WEEK = 3;
export const DEFAULT_STAKE = 6;

/** Remaining challenge tokens for a user in a week (absent doc = full allowance). */
export async function getTokenRemaining(uid: string, week: number, perWeek: number): Promise<number> {
  const snap = await adminDb.collection(COLLECTIONS.tokenBalances).doc(tokenBalanceId(uid, week)).get();
  if (!snap.exists) return perWeek;
  return (snap.data() as { remaining: number }).remaining;
}

/** The week the league is currently focused on (next upcoming match, else 1). */
export function computeActiveWeek(matches: MatchDoc[], now = Date.now()): number {
  const upcoming = matches
    .filter((m) => m.status === "upcoming" && m.kickoff > now)
    .sort((a, b) => a.kickoff - b.kickoff);
  return upcoming[0]?.week ?? matches[matches.length - 1]?.week ?? 1;
}

export interface DuelSideView {
  name: string;
  init: string;
  color: string;
  pick: Scoreline;
}
export interface DuelView {
  id: string;
  matchId: string;
  home: string;
  away: string;
  time: string;
  stake: number;
  status: DuelDoc["status"];
  iChallenged: boolean;
  me: DuelSideView;
  opp: DuelSideView;
}

export interface ChallengeTarget {
  matchId: string;
  week: number;
  home: string;
  away: string;
  group: string;
  time: string;
  targetUid: string;
  targetName: string;
  targetInit: string;
  targetColor: string;
  targetPick: Scoreline;
}

export interface IzazoviData {
  activeWeek: number;
  tokensRemaining: number; // active week (hero display)
  tokensPerWeek: number;
  tokensByWeek: Record<number, number>; // remaining per week that has targets
  duels: DuelView[];
  targets: ChallengeTarget[];
}

export async function getIzazoviData(uid: string): Promise<IzazoviData> {
  const now = Date.now();
  const [cfg, matches, duels, usersMap, predsSnap] = await Promise.all([
    getConfig(),
    getAllMatches(),
    getMyDuels(uid),
    getUsersMap(),
    adminDb.collection(COLLECTIONS.predictions).get(),
  ]);

  const tokensPerWeek = cfg?.tokensPerWeek ?? DEFAULT_TOKENS_PER_WEEK;
  const activeWeek = computeActiveWeek(matches, now);
  const tokensRemaining = await getTokenRemaining(uid, activeWeek, tokensPerWeek);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const me = usersMap.get(uid);

  const duelViews: DuelView[] = duels.map((d) => {
    const m = matchById.get(d.matchId);
    const iChallenged = d.challengerUid === uid;
    const oppUid = iChallenged ? d.opponentUid : d.challengerUid;
    const opp = usersMap.get(oppUid);
    return {
      id: d.id,
      matchId: d.matchId,
      home: m?.home ?? "?",
      away: m?.away ?? "?",
      time: m?.time ?? "",
      stake: d.stake,
      status: d.status,
      iChallenged,
      me: {
        name: me?.name ?? "Ti",
        init: me?.init ?? "TI",
        color: me?.color ?? "#0E1116",
        pick: iChallenged ? d.challengerPick : d.opponentPick,
      },
      opp: {
        name: opp?.name ?? "Igrač",
        init: opp?.init ?? "?",
        color: opp?.color ?? "#888",
        pick: iChallenged ? d.opponentPick : d.challengerPick,
      },
    };
  });

  // Predictions grouped by match.
  const byMatch = new Map<string, PredictionDoc[]>();
  predsSnap.docs.forEach((doc) => {
    const p = doc.data() as PredictionDoc;
    const arr = byMatch.get(p.matchId) ?? [];
    arr.push(p);
    byMatch.set(p.matchId, arr);
  });

  // Already-dueled opponents per match (so we don't offer them again).
  const dueledKey = new Set(
    duels.map((d) => `${d.matchId}_${d.challengerUid === uid ? d.opponentUid : d.challengerUid}`),
  );

  // Targets: others' picks on upcoming, not-locked matches where I've also tipped
  // (peek rule) — challengeable until kickoff.
  const targets: ChallengeTarget[] = [];
  for (const m of matches) {
    if (m.status !== "upcoming" || m.kickoff <= now) continue;
    const preds = byMatch.get(m.id) ?? [];
    const iTipped = preds.some((p) => p.uid === uid);
    if (!iTipped) continue;
    for (const p of preds) {
      if (p.uid === uid) continue;
      if (dueledKey.has(`${m.id}_${p.uid}`)) continue;
      const u = usersMap.get(p.uid);
      targets.push({
        matchId: m.id,
        week: m.week,
        home: m.home,
        away: m.away,
        group: m.group,
        time: m.time,
        targetUid: p.uid,
        targetName: u?.name ?? "Igrač",
        targetInit: u?.init ?? "?",
        targetColor: u?.color ?? "#888",
        targetPick: p.pick,
      });
    }
  }

  // Remaining tokens per week that actually has challengeable targets (+ active
  // week), so each target row can be gated by ITS week's balance.
  const weeksNeeded = new Set<number>([activeWeek, ...targets.map((t) => t.week)]);
  const tokensByWeek: Record<number, number> = {};
  await Promise.all(
    [...weeksNeeded].map(async (w) => {
      tokensByWeek[w] = w === activeWeek ? tokensRemaining : await getTokenRemaining(uid, w, tokensPerWeek);
    }),
  );

  return { activeWeek, tokensRemaining, tokensPerWeek, tokensByWeek, duels: duelViews, targets };
}

export interface ChallengeContext {
  match: MatchDoc;
  targetUid: string;
  targetName: string;
  targetInit: string;
  targetColor: string;
  targetPick: Scoreline;
  tokensRemaining: number;
}

export async function getChallengeContext(
  matchId: string,
  targetUid: string,
  uid: string,
): Promise<ChallengeContext | null> {
  const [match, cfg, usersMap, targetPredSnap, myPick] = await Promise.all([
    getMatch(matchId),
    getConfig(),
    getUsersMap(),
    adminDb.collection(COLLECTIONS.predictions).doc(`${matchId}_${targetUid}`).get(),
    getMyPick(uid, matchId),
  ]);
  if (!match || !targetPredSnap.exists || targetUid === uid) return null;
  // Peek-prevention: only reveal the opponent's pick once I've tipped (or final).
  if (match.status !== "final" && !myPick) return null;

  const targetPred = targetPredSnap.data() as PredictionDoc;
  const tokensPerWeek = cfg?.tokensPerWeek ?? DEFAULT_TOKENS_PER_WEEK;
  const tokensRemaining = await getTokenRemaining(uid, match.week, tokensPerWeek);
  const u = usersMap.get(targetUid);

  return {
    match,
    targetUid,
    targetName: u?.name ?? "Igrač",
    targetInit: u?.init ?? "?",
    targetColor: u?.color ?? "#888",
    targetPick: targetPred.pick,
    tokensRemaining,
  };
}
