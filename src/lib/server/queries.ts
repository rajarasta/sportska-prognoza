import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, CONFIG_DOC_ID, predictionId } from "@/lib/collections";
import { scorePick, DEFAULT_SCORE_CONFIG, type ScoreConfig } from "@/lib/scoring";
import type {
  DuelDoc,
  LeagueConfigDoc,
  MatchDoc,
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
  exact: number;
  move: number; // prevRank - rank (positive = climbed)
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await adminDb.collection(COLLECTIONS.users).get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

export async function getUsersMap(): Promise<Map<string, UserDoc>> {
  const users = await getAllUsers();
  return new Map(users.map((u) => [u.uid, u]));
}

export async function getLeaderboard(meUid: string): Promise<Standing[]> {
  const users = await getAllUsers();
  users.sort((a, b) => b.totalPoints - a.totalPoints || b.exactCount - a.exactCount);
  return users.map((u, i) => {
    const rank = i + 1;
    const move = u.prevRank ? u.prevRank - rank : 0;
    return {
      uid: u.uid,
      name: u.name,
      init: u.init,
      color: u.color,
      you: u.uid === meUid,
      points: u.totalPoints,
      weeklyPoints: u.weeklyPoints ?? {},
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
  earned: number | null;
}

export async function getMatchViews(uid: string): Promise<MatchView[]> {
  const [matches, mine] = await Promise.all([getAllMatches(), getMyPredictions(uid)]);
  return matches.map((m) => {
    const p = mine.get(m.id);
    return { ...m, myPick: p?.pick ?? null, earned: p?.points ?? null };
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
  points: number | null;
}

/** Whether the match has already kicked off / finished. */
export function isLocked(m: MatchDoc, now = Date.now()): boolean {
  return m.status === "final" || m.status === "live" || now >= m.kickoff;
}

export interface MatchDetailData {
  match: MatchDoc;
  myPick: PredictionDoc | null;
  others: OtherPick[];
  revealOthers: boolean; // peek-prevention: only after I've tipped, or once final
  breakdown: ReturnType<typeof scorePick> | null;
}

export async function getMatchDetail(id: string, uid: string): Promise<MatchDetailData | null> {
  const match = await getMatch(id);
  if (!match) return null;
  const [myPick, predsSnap, usersMap, cfg] = await Promise.all([
    getMyPick(uid, id),
    adminDb.collection(COLLECTIONS.predictions).where("matchId", "==", id).get(),
    getUsersMap(),
    getConfig(),
  ]);

  const isFinal = match.status === "final" && match.res;
  // Peek-prevention: reveal others only once I've committed my own pick, or final.
  const revealOthers = Boolean(isFinal || myPick);

  const others: OtherPick[] = revealOthers
    ? predsSnap.docs
        .map((d) => d.data() as PredictionDoc)
        .filter((p) => p.uid !== uid)
        .map((p) => {
          const u = usersMap.get(p.uid);
          return {
            uid: p.uid,
            name: u?.name ?? "Igrač",
            init: u?.init ?? "?",
            color: u?.color ?? "#888",
            pick: p.pick,
            points: p.points,
          };
        })
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name))
    : [];

  const breakdown =
    isFinal && myPick ? scorePick(myPick.pick, match.res as Scoreline, scoreConfigFrom(cfg)) : null;

  return { match, myPick, others, revealOthers, breakdown };
}

// ── Profile ──
export interface HistoryRow {
  matchId: string;
  home: string;
  away: string;
  res: Scoreline;
  pick: Scoreline;
  earned: number;
}

export async function getMyHistory(uid: string): Promise<HistoryRow[]> {
  const [matches, mine] = await Promise.all([getAllMatches(), getMyPredictions(uid)]);
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
      pick: p.pick,
      earned: p.points ?? 0,
    });
  }
  // most recent first
  return rows.reverse();
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
