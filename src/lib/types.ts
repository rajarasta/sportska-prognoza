// ── Shared domain types (client + server) ──

/** [home, away] goals. */
export type Scoreline = [number, number];
export type MatchStage = "group" | "knockout";
export type MatchWinner = "home" | "away";

export interface UserDoc {
  uid: string;
  email: string;
  name: string;
  init: string; // 2-letter initials
  color: string; // hex avatar color
  isAdmin: boolean;
  photoURL?: string | null;
  createdAt: number; // epoch ms
  // aggregates, maintained by the scoring engine:
  totalPoints: number;
  exactCount: number;
  weeklyPoints?: Record<string, number>; // { "1": 12.4, ... }
  bestWeekPoints?: number;
  rank?: number | null;
  prevRank?: number | null;
  m2TotalPoints?: number;
  m2WeeklyPoints?: Record<string, number>;
  m2BestWeekPoints?: number;
  m2Rank?: number | null;
  m2PrevRank?: number | null;
  duelsWon?: number;
  duelsLost?: number;
}

export interface AllowlistDoc {
  email: string;
  name?: string | null;
  addedAt: number;
}

export type MatchStatus = "upcoming" | "live" | "final";

export interface MatchDoc {
  id: string; // 'm001'..
  no: number; // fixture number from the schedule
  group: string; // 'A'..'L'
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM' (local kickoff label)
  kickoff: number; // epoch ms — authoritative for before/after-kickoff gating
  week: number;
  stage?: MatchStage;
  home: string; // team code
  away: string; // team code
  status: MatchStatus;
  res: Scoreline | null; // 90-minute result once final
  extraTimeRes?: Scoreline | null; // knockout only: goals in extra time, not cumulative
  penaltyRes?: Scoreline | null; // knockout only: shootout score, stored but not scored
  winner?: MatchWinner | null; // knockout only: who advances
  friendly?: boolean; // true for non-WC test/friendly fixtures (no group)
}

export interface PredictionDoc {
  id: string; // `${matchId}_${uid}`
  matchId: string;
  uid: string;
  pick: Scoreline; // 90-minute pick
  extraTimePick?: Scoreline | null; // knockout only: goals in extra time, not cumulative
  penaltyWinnerPick?: MatchWinner | null; // knockout only: who advances if shootout is reached
  penaltyPick?: Scoreline | null; // knockout only: optional shootout score, stored but not scored
  submittedAt: number;
  // written by the server only, after the match is final:
  points: number | null; // base scoring of this pick (Gauss + bonus / exact)
  effectivePoints?: number | null; // duel-adjusted contribution to the user's total
  m2Points?: number | null; // base scoring under Model 2
  m2EffectivePoints?: number | null; // duel-adjusted contribution under Model 2
  exact: boolean | null;
}

export type DuelRole = "challenger" | "challenged";
export type DuelStatus = "active" | "resolved";

export interface DuelDoc {
  id: string;
  matchId: string;
  week: number;
  challengerUid: string;
  opponentUid: string;
  challengerPick: Scoreline;
  challengerExtraTimePick?: Scoreline | null;
  challengerPenaltyWinnerPick?: MatchWinner | null;
  challengerPenaltyPick?: Scoreline | null;
  opponentPick: Scoreline; // locked snapshot of opponent's submitted pick
  opponentExtraTimePick?: Scoreline | null;
  opponentPenaltyWinnerPick?: MatchWinner | null;
  opponentPenaltyPick?: Scoreline | null;
  stake: number; // 6
  status: DuelStatus;
  winnerUid?: string | null; // null = neither won the 2× (normal scoring fallback)
  resolvedAt?: number | null;
}

export interface TokenBalanceDoc {
  id: string; // `${uid}_${week}`
  uid: string;
  week: number;
  remaining: number;
}

export interface TeamDoc {
  code: string; // FIFA 3-letter
  name: string; // Croatian
  c1: string; // gradient start
  c2: string; // gradient end
}

export interface WeekDef {
  n: number;
  label: string;
  range: string;
  start: string; // ISO
  end: string; // ISO
}

export interface LeagueConfigDoc {
  sigma: number; // 1.9
  exactPoints: number; // 3
  goalBonus: number; // 0.3
  tokensPerWeek: number; // 3
  tokensByWeek?: Record<string, number>; // per-week allowance override, e.g. { "0": 1 } for the trial
  duelStake: number; // 6
  season: string; // 'SP 2026'
  weeks: WeekDef[];
}
