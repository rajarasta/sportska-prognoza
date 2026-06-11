"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, predictionId } from "@/lib/collections";
import { getMatch } from "@/lib/server/queries";
import type { PredictionDoc, Scoreline } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function validScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 12;
}

/** Submit the current user's prediction for a match (before kickoff only).
 *  One-shot: submitting reveals the rest of the team's tips, so the tip is
 *  final — it can never be edited afterwards. */
export async function submitPrediction(matchId: string, pick: Scoreline): Promise<ActionResult> {
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

  const doc: PredictionDoc = {
    id: predictionId(matchId, uid),
    matchId,
    uid,
    pick: [pick[0], pick[1]],
    submittedAt: Date.now(),
    points: null,
    exact: null,
  };
  await adminDb.collection(COLLECTIONS.predictions).doc(doc.id).set(doc);

  revalidatePath("/raspored");
  revalidatePath(`/match/${matchId}`);
  revalidatePath("/profil");
  return { ok: true };
}
