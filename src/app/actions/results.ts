"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail } from "@/lib/server/allowlist";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getMatch } from "@/lib/server/queries";
import { recomputeScores } from "@/lib/server/scoring-engine";
import type { Scoreline } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const validScore = (n: number) => Number.isInteger(n) && n >= 0 && n <= 30;

function revalidateAll(matchId: string) {
  for (const p of ["/bodovi", "/raspored", "/profil", "/izazovi", "/admin", `/match/${matchId}`]) {
    revalidatePath(p);
  }
}

/** Admin: set a final result for a match and recompute all scores + duels. */
export async function enterResult(matchId: string, res: Scoreline): Promise<ActionResult> {
  const { email } = await requireUser();
  if (!isAdminEmail(email)) return { ok: false, error: "Samo administrator može unositi rezultate." };
  if (!validScore(res[0]) || !validScore(res[1])) return { ok: false, error: "Neispravan rezultat." };

  const match = await getMatch(matchId);
  if (!match) return { ok: false, error: "Utakmica ne postoji." };

  await adminDb.collection(COLLECTIONS.matches).doc(matchId).update({
    res: [res[0], res[1]],
    status: "final",
  });
  await recomputeScores();
  revalidateAll(matchId);
  return { ok: true };
}

/** Admin: revert a match to upcoming (clears result) and recompute. */
export async function clearResult(matchId: string): Promise<ActionResult> {
  const { email } = await requireUser();
  if (!isAdminEmail(email)) return { ok: false, error: "Samo administrator." };

  const match = await getMatch(matchId);
  if (!match) return { ok: false, error: "Utakmica ne postoji." };

  await adminDb.collection(COLLECTIONS.matches).doc(matchId).update({ res: null, status: "upcoming" });
  await recomputeScores();
  revalidateAll(matchId);
  return { ok: true };
}
