// ─────────────────────────────────────────────────────────────
// Pure scoring engine — shared by the client (live preview on Unos tipa)
// and the server (authoritative scoring). NO firebase imports.
//
// Rules (from the handoff):
//   • Exact result            → exactPoints (3)
//   • Otherwise               → Gaussian closeness exp(-d²/(2σ²)), σ=1.9  (0..~1)
//                               + goalBonus (0.3) if exactly one side's goals match
// ─────────────────────────────────────────────────────────────
import type { MatchWinner, Scoreline } from "@/lib/types";

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

export type Outcome = "1" | "X" | "2";
export type M2ScoreBranch = "exact" | "outcome" | "wrong";

export interface M2ScoreBreakdown {
  total: number;
  exact: boolean;
  outcomeCorrect: boolean;
  branch: M2ScoreBranch;
  gauss: number;
  goalHits: number;
}

export const M2_DENOMINATOR = 7.22;
export const M2_EXACT_POINTS = 3;
export const M2_PENALTY_WINNER_POINTS = 0.5;

export interface M2KnockoutInput {
  pick: Scoreline;
  res: Scoreline;
  extraTimePick?: Scoreline | null;
  extraTimeRes?: Scoreline | null;
  penaltyWinnerPick?: MatchWinner | null;
  winner?: MatchWinner | null;
  penaltyPick?: Scoreline | null;
  penaltyRes?: Scoreline | null;
}

export type M2PhaseState = "unlocked" | "not-unlocked" | "voided" | "missing-pick" | "missing-result";

export interface M2ExtraTimeBreakdown {
  state: M2PhaseState;
  pick: Scoreline | null;
  res: Scoreline | null;
  breakdown: M2ScoreBreakdown | null;
  total: number;
}

export interface M2PenaltyBreakdown {
  state: M2PhaseState;
  pick: MatchWinner | null;
  winner: MatchWinner | null;
  penaltyPick: Scoreline | null;
  penaltyRes: Scoreline | null;
  correct: boolean | null;
  total: number;
}

export interface M2PredictionScoreBreakdown extends M2ScoreBreakdown {
  kind: "standard" | "knockout";
  base: M2ScoreBreakdown;
  extraTime?: M2ExtraTimeBreakdown;
  penalties?: M2PenaltyBreakdown;
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

export function outcomeOf(score: Scoreline): Outcome {
  if (score[0] > score[1]) return "1";
  if (score[0] < score[1]) return "2";
  return "X";
}

export function scorePickM2(pick: Scoreline, res: Scoreline): M2ScoreBreakdown {
  const d2 = (pick[0] - res[0]) ** 2 + (pick[1] - res[1]) ** 2;
  const g = Math.exp(-d2 / M2_DENOMINATOR);
  const goalHits = (pick[0] === res[0] ? 1 : 0) + (pick[1] === res[1] ? 1 : 0);
  const exact = isExact(pick, res);
  const outcomeCorrect = outcomeOf(pick) === outcomeOf(res);

  if (exact) {
    return {
      total: M2_EXACT_POINTS,
      exact: true,
      outcomeCorrect: true,
      branch: "exact",
      gauss: round2(g),
      goalHits,
    };
  }

  if (outcomeCorrect) {
    return {
      total: round2(1 + g),
      exact: false,
      outcomeCorrect: true,
      branch: "outcome",
      gauss: round2(g),
      goalHits,
    };
  }

  return {
    total: round2(0.5 * goalHits + 0.4 * g),
    exact: false,
    outcomeCorrect: false,
    branch: "wrong",
    gauss: round2(g),
    goalHits,
  };
}

function fromBase(kind: M2PredictionScoreBreakdown["kind"], base: M2ScoreBreakdown): M2PredictionScoreBreakdown {
  return { ...base, kind, base };
}

const isDraw = (score: Scoreline): boolean => outcomeOf(score) === "X";

export function scoreStandardPredictionM2(pick: Scoreline, res: Scoreline): M2PredictionScoreBreakdown {
  return fromBase("standard", scorePickM2(pick, res));
}

export function scoreKnockoutPickM2(input: M2KnockoutInput): M2PredictionScoreBreakdown {
  const base = scorePickM2(input.pick, input.res);
  let total = base.total;

  const ninetyActualDraw = isDraw(input.res);
  const ninetyPickDraw = isDraw(input.pick);
  const extraTime: M2ExtraTimeBreakdown = {
    state: "not-unlocked",
    pick: input.extraTimePick ?? null,
    res: input.extraTimeRes ?? null,
    breakdown: null,
    total: 0,
  };
  const penalties: M2PenaltyBreakdown = {
    state: "not-unlocked",
    pick: input.penaltyWinnerPick ?? null,
    winner: input.winner ?? null,
    penaltyPick: input.penaltyPick ?? null,
    penaltyRes: input.penaltyRes ?? null,
    correct: null,
    total: 0,
  };

  if (!ninetyActualDraw) {
    if (ninetyPickDraw) {
      extraTime.state = "voided";
      penalties.state = "voided";
    }
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!ninetyPickDraw) {
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!input.extraTimeRes) {
    extraTime.state = "missing-result";
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!input.extraTimePick) {
    extraTime.state = "missing-pick";
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  const extraTimeBreakdown = scorePickM2(input.extraTimePick, input.extraTimeRes);
  const extraTimePoints = round2(extraTimeBreakdown.total / 3);
  extraTime.state = "unlocked";
  extraTime.breakdown = extraTimeBreakdown;
  extraTime.total = extraTimePoints;
  total = round2(total + extraTimePoints);

  const extraActualDraw = isDraw(input.extraTimeRes);
  const extraPickDraw = isDraw(input.extraTimePick);
  if (!extraActualDraw) {
    if (extraPickDraw) penalties.state = "voided";
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!extraPickDraw) {
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!input.winner) {
    penalties.state = "missing-result";
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  if (!input.penaltyWinnerPick) {
    penalties.state = "missing-pick";
    return { ...base, kind: "knockout", base, total: round2(total), extraTime, penalties };
  }

  penalties.state = "unlocked";
  penalties.correct = input.penaltyWinnerPick === input.winner;
  penalties.total = penalties.correct ? M2_PENALTY_WINNER_POINTS : 0;
  total = round2(total + penalties.total);

  return { ...base, kind: "knockout", base, total, extraTime, penalties };
}
