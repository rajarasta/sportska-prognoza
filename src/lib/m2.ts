import { isKnockoutMatch } from "@/lib/matches";
import {
  scoreKnockoutPickM2,
  scoreStandardPredictionM2,
  type M2PredictionScoreBreakdown,
} from "@/lib/scoring";
import type { DuelDoc, MatchDoc, Scoreline, PredictionDoc } from "@/lib/types";

type FinalMatch = MatchDoc & { res: Scoreline };

export function scorePredictionForMatchM2(
  prediction: Pick<
    PredictionDoc,
    "pick" | "extraTimePick" | "penaltyWinnerPick" | "penaltyPick"
  >,
  match: FinalMatch,
): M2PredictionScoreBreakdown {
  if (!isKnockoutMatch(match)) return scoreStandardPredictionM2(prediction.pick, match.res);
  return scoreKnockoutPickM2({
    pick: prediction.pick,
    res: match.res,
    extraTimePick: prediction.extraTimePick ?? null,
    extraTimeRes: match.extraTimeRes ?? null,
    penaltyWinnerPick: prediction.penaltyWinnerPick ?? null,
    winner: match.winner ?? null,
    penaltyPick: prediction.penaltyPick ?? null,
    penaltyRes: match.penaltyRes ?? null,
  });
}

export function scoreDuelParticipantForMatchM2(
  duel: DuelDoc,
  match: FinalMatch,
  participant: "challenger" | "opponent",
): M2PredictionScoreBreakdown {
  if (participant === "challenger") {
    return scorePredictionForMatchM2(
      {
        pick: duel.challengerPick,
        extraTimePick: duel.challengerExtraTimePick ?? null,
        penaltyWinnerPick: duel.challengerPenaltyWinnerPick ?? null,
        penaltyPick: duel.challengerPenaltyPick ?? null,
      },
      match,
    );
  }

  return scorePredictionForMatchM2(
    {
      pick: duel.opponentPick,
      extraTimePick: duel.opponentExtraTimePick ?? null,
      penaltyWinnerPick: duel.opponentPenaltyWinnerPick ?? null,
      penaltyPick: duel.opponentPenaltyPick ?? null,
    },
    match,
  );
}
