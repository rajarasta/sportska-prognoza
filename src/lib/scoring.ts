// ─────────────────────────────────────────────────────────────
// Pure scoring engine — shared by the client (live preview on Unos tipa)
// and the server (authoritative scoring). NO firebase imports.
//
// Rules (from the handoff):
//   • Exact result            → exactPoints (3)
//   • Otherwise               → Gaussian closeness exp(-d²/(2σ²)), σ=1.9  (0..~1)
//                               + goalBonus (0.3) if exactly one side's goals match
// ─────────────────────────────────────────────────────────────
import type { Scoreline } from "@/lib/types";

export interface ScoreConfig {
  sigma: number;
  exactPoints: number;
  goalBonus: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  sigma: 1.9,
  exactPoints: 3,
  goalBonus: 0.3,
};

export interface ScoreBreakdown {
  total: number;
  exact: boolean;
  gauss: number;
  bonus: number;
}

/** Gaussian closeness component (0 for an exact hit — that's handled separately). */
export function gaussPts(pick: Scoreline, res: Scoreline, sigma: number): number {
  const d = Math.sqrt((pick[0] - res[0]) ** 2 + (pick[1] - res[1]) ** 2);
  if (d === 0) return 0;
  return Math.exp(-(d * d) / (2 * sigma * sigma));
}

/** +bonus for each side whose goal count matches (but matching both = exact, handled above). */
export function goalBonus(pick: Scoreline, res: Scoreline, bonus: number): number {
  if (pick[0] === res[0] && pick[1] === res[1]) return 0;
  let b = 0;
  if (pick[0] === res[0]) b += bonus;
  if (pick[1] === res[1]) b += bonus;
  return b;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Points for a single prediction vs an actual result (no challenge bonus). */
export function scorePick(
  pick: Scoreline,
  res: Scoreline,
  cfg: ScoreConfig = DEFAULT_SCORE_CONFIG,
): ScoreBreakdown {
  if (pick[0] === res[0] && pick[1] === res[1]) {
    return { total: cfg.exactPoints, exact: true, gauss: 0, bonus: 0 };
  }
  const g = gaussPts(pick, res, cfg.sigma);
  const b = goalBonus(pick, res, cfg.goalBonus);
  return { total: round2(g + b), exact: false, gauss: round2(g), bonus: round2(b) };
}

export const isExact = (pick: Scoreline, res: Scoreline): boolean =>
  pick[0] === res[0] && pick[1] === res[1];
