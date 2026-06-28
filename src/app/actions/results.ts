"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail } from "@/lib/server/allowlist";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getMatch } from "@/lib/server/queries";
import { recomputeScores } from "@/lib/server/scoring-engine";
import { isKnockoutMatch } from "@/lib/matches";
import type { MatchWinner, Scoreline } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface KnockoutResultInput {
  extraTimeRes?: Scoreline | null;
  penaltyRes?: Scoreline | null;
  winner?: MatchWinner | null;
}

const validScore = (n: number) => Number.isInteger(n) && n >= 0 && n <= 30;
const scoreIsDraw = (score: Scoreline) => score[0] === score[1];
const scoreWinner = (score: Scoreline): MatchWinner | null =>
  score[0] > score[1] ? "home" : score[0] < score[1] ? "away" : null;

function normalizeKnockoutResult(
  res: Scoreline,
  input: KnockoutResultInput | undefined,
): { ok: true; extraTimeRes: Scoreline | null; penaltyRes: Scoreline | null; winner: MatchWinner | null } | { ok: false; error?: string } {
  const ninetyWinner = scoreWinner(res);
  if (ninetyWinner) {
    if (input?.winner && input.winner !== ninetyWinner) {
      return { ok: false, error: "Prolaznik se ne slaže s rezultatom nakon 90 minuta." };
    }
    return { ok: true, extraTimeRes: null, penaltyRes: null, winner: ninetyWinner };
  }

  const extraTimeRes = input?.extraTimeRes ?? null;
  if (!extraTimeRes) return { ok: false, error: "Za neriješenih 90 min upiši rezultat produžetka." };
  if (!validScore(extraTimeRes[0]) || !validScore(extraTimeRes[1])) {
    return { ok: false, error: "Neispravan rezultat produžetka." };
  }

  const extraWinner = scoreWinner(extraTimeRes);
  if (extraWinner) {
    if (input?.winner && input.winner !== extraWinner) {
      return { ok: false, error: "Prolaznik se ne slaže s rezultatom produžetka." };
    }
    return { ok: true, extraTimeRes: [extraTimeRes[0], extraTimeRes[1]], penaltyRes: null, winner: extraWinner };
  }

  const penaltyRes = input?.penaltyRes ?? null;
  if (!penaltyRes) return { ok: false, error: "Za neriješen produžetak upiši rezultat penala." };
  if (!validScore(penaltyRes[0]) || !validScore(penaltyRes[1]) || scoreIsDraw(penaltyRes)) {
    return { ok: false, error: "Rezultat penala mora imati pobjednika." };
  }

  const penaltyWinner = scoreWinner(penaltyRes);
  if (!penaltyWinner) return { ok: false, error: "Rezultat penala mora imati pobjednika." };
  if (input?.winner && input.winner !== penaltyWinner) {
    return { ok: false, error: "Prolaznik se ne slaže s penalima." };
  }

  return {
    ok: true,
    extraTimeRes: [extraTimeRes[0], extraTimeRes[1]],
    penaltyRes: [penaltyRes[0], penaltyRes[1]],
    winner: penaltyWinner,
  };
}

function revalidateAll(matchId: string) {
  for (const p of ["/bodovi", "/raspored", "/profil", "/izazovi", "/admin", `/match/${matchId}`]) {
    revalidatePath(p);
  }
}

/** Admin: set a final result for a match and recompute all scores + duels. */
export async function enterResult(
  matchId: string,
  res: Scoreline,
  knockout?: KnockoutResultInput,
): Promise<ActionResult> {
  const { email } = await requireUser();
  if (!isAdminEmail(email)) return { ok: false, error: "Samo administrator može unositi rezultate." };
  if (!validScore(res[0]) || !validScore(res[1])) return { ok: false, error: "Neispravan rezultat." };

  const match = await getMatch(matchId);
  if (!match) return { ok: false, error: "Utakmica ne postoji." };

  const knockoutResult = isKnockoutMatch(match)
    ? normalizeKnockoutResult(res, knockout)
    : { ok: true as const, extraTimeRes: null, penaltyRes: null, winner: null };
  if (!knockoutResult.ok) return knockoutResult;

  await adminDb.collection(COLLECTIONS.matches).doc(matchId).update({
    res: [res[0], res[1]],
    extraTimeRes: knockoutResult.extraTimeRes,
    penaltyRes: knockoutResult.penaltyRes,
    winner: knockoutResult.winner,
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

  await adminDb.collection(COLLECTIONS.matches).doc(matchId).update({
    res: null,
    extraTimeRes: null,
    penaltyRes: null,
    winner: null,
    status: "upcoming",
  });
  await recomputeScores();
  revalidateAll(matchId);
  return { ok: true };
}
