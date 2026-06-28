"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, predictionId } from "@/lib/collections";
import { getMatch } from "@/lib/server/queries";
import { isKnockoutMatch } from "@/lib/matches";
import type { MatchWinner, PredictionDoc, Scoreline } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface KnockoutPredictionInput {
  extraTimePick?: Scoreline | null;
  penaltyWinnerPick?: MatchWinner | null;
  penaltyPick?: Scoreline | null;
}

function validScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 12;
}

function validPenaltyScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 30;
}

function validWinner(w: unknown): w is MatchWinner {
  return w === "home" || w === "away";
}

function scoreIsDraw(score: Scoreline): boolean {
  return score[0] === score[1];
}

function normalizeKnockoutPrediction(
  pick: Scoreline,
  input: KnockoutPredictionInput | undefined,
): { ok: true; extraTimePick: Scoreline | null; penaltyWinnerPick: MatchWinner | null; penaltyPick: Scoreline | null } | { ok: false; error?: string } {
  if (!scoreIsDraw(pick)) {
    return { ok: true, extraTimePick: null, penaltyWinnerPick: null, penaltyPick: null };
  }

  const extraTimePick = input?.extraTimePick ?? null;
  if (!extraTimePick) {
    return { ok: false, error: "Za neriješenih 90 min upiši i tip produžetka." };
  }
  if (!validScore(extraTimePick[0]) || !validScore(extraTimePick[1])) {
    return { ok: false, error: "Rezultat produžetka mora biti između 0 i 12." };
  }

  if (!scoreIsDraw(extraTimePick)) {
    return { ok: true, extraTimePick: [extraTimePick[0], extraTimePick[1]], penaltyWinnerPick: null, penaltyPick: null };
  }

  if (!validWinner(input?.penaltyWinnerPick)) {
    return { ok: false, error: "Za neriješen produžetak odaberi tko prolazi dalje." };
  }

  const penaltyPick = input?.penaltyPick ?? null;
  if (penaltyPick && (!validPenaltyScore(penaltyPick[0]) || !validPenaltyScore(penaltyPick[1]))) {
    return { ok: false, error: "Rezultat penala mora biti između 0 i 30." };
  }

  return {
    ok: true,
    extraTimePick: [extraTimePick[0], extraTimePick[1]],
    penaltyWinnerPick: input.penaltyWinnerPick,
    penaltyPick: penaltyPick ? [penaltyPick[0], penaltyPick[1]] : null,
  };
}

/** Submit the current user's prediction for a match (before kickoff only).
 *  One-shot: submitting reveals the rest of the team's tips, so the tip is
 *  final — it can never be edited afterwards. */
export async function submitPrediction(
  matchId: string,
  pick: Scoreline,
  knockout?: KnockoutPredictionInput,
): Promise<ActionResult> {
  const { uid } = await requireUser();

  if (!validScore(pick[0]) || !validScore(pick[1])) {
    return { ok: false, error: "Rezultat mora biti između 0 i 12." };
  }

  const match = await getMatch(matchId);
  if (!match) return { ok: false, error: "Utakmica ne postoji." };
  if (match.status !== "upcoming" || Date.now() >= match.kickoff) {
    return { ok: false, error: "Utakmica je zaključana — tip se više ne može mijenjati." };
  }
  const existing = await adminDb
    .collection(COLLECTIONS.predictions)
    .doc(predictionId(matchId, uid))
    .get();
  if (existing.exists) {
    return { ok: false, error: "Tip je već predan — nakon predaje se ne može mijenjati." };
  }

  const knockoutPick = isKnockoutMatch(match)
    ? normalizeKnockoutPrediction(pick, knockout)
    : { ok: true as const, extraTimePick: null, penaltyWinnerPick: null, penaltyPick: null };
  if (!knockoutPick.ok) return knockoutPick;

  const doc: PredictionDoc = {
    id: predictionId(matchId, uid),
    matchId,
    uid,
    pick: [pick[0], pick[1]],
    extraTimePick: knockoutPick.extraTimePick,
    penaltyWinnerPick: knockoutPick.penaltyWinnerPick,
    penaltyPick: knockoutPick.penaltyPick,
    submittedAt: Date.now(),
    points: null,
    m2Points: null,
    m2EffectivePoints: null,
    exact: null,
  };
  await adminDb.collection(COLLECTIONS.predictions).doc(doc.id).set(doc);

  revalidatePath("/raspored");
  revalidatePath(`/match/${matchId}`);
  revalidatePath("/profil");
  return { ok: true };
}
