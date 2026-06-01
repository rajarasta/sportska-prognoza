// Pure duel (challenge) resolution. Shared client/server. No firebase imports.
import { scorePick, isExact, type ScoreConfig } from "@/lib/scoring";
import type { Scoreline } from "@/lib/types";

export type DuelWinner = "challenger" | "opponent" | null;

export interface DuelOutcome {
  challengerPoints: number;
  opponentPoints: number;
  winner: DuelWinner; // null = neither hit exact (normal scoring fallback)
}

/**
 * Resolve a duel against the actual result:
 *  • challenger hits exact → challenger gets 2× (no Gauss), opponent 0
 *  • opponent hits exact   → opponent gets 2×, challenger 0
 *  • both miss             → both get normal scoring (Gauss + goal bonus), no 2×
 * Scorelines are guaranteed different at creation, so at most one can be exact.
 */
export function resolveDuel(
  challengerPick: Scoreline,
  opponentPick: Scoreline,
  res: Scoreline,
  cfg: ScoreConfig,
): DuelOutcome {
  const dbl = 2 * cfg.exactPoints;
  if (isExact(challengerPick, res)) {
    return { challengerPoints: dbl, opponentPoints: 0, winner: "challenger" };
  }
  if (isExact(opponentPick, res)) {
    return { challengerPoints: 0, opponentPoints: dbl, winner: "opponent" };
  }
  return {
    challengerPoints: scorePick(challengerPick, res, cfg).total,
    opponentPoints: scorePick(opponentPick, res, cfg).total,
    winner: null,
  };
}
