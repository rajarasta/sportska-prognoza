// Firestore collection names + well-known doc ids (client + server).
export const COLLECTIONS = {
  config: "leagueConfig",
  allowlist: "allowlist",
  users: "users",
  teams: "teams",
  matches: "matches",
  predictions: "predictions",
  duels: "duels",
  tokenBalances: "tokenBalances",
} as const;

export const CONFIG_DOC_ID = "default";

export const predictionId = (matchId: string, uid: string) => `${matchId}_${uid}`;
export const tokenBalanceId = (uid: string, week: number) => `${uid}_w${week}`;
