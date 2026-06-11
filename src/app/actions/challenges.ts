"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, tokenBalanceId } from "@/lib/collections";
import { getConfig, getMatch, getMyPick } from "@/lib/server/queries";
import { DEFAULT_STAKE, tokensForWeek } from "@/lib/server/izazovi";
import type { DuelDoc, PredictionDoc } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Challenge an opponent on a match. The duel is played with MY already-submitted
 *  tip (tips are final once submitted), never a fresh score — otherwise seeing the
 *  opponent's tip first would let me craft a counter-pick. */
export async function createChallenge(matchId: string, targetUid: string): Promise<ActionResult> {
  const { uid } = await requireUser();

  if (targetUid === uid) return { ok: false, error: "Ne možeš izazvati sam sebe." };

  const [match, cfg, targetSnap, myPick] = await Promise.all([
    getMatch(matchId),
    getConfig(),
    adminDb.collection(COLLECTIONS.predictions).doc(`${matchId}_${targetUid}`).get(),
    getMyPick(uid, matchId),
  ]);

  if (!match) return { ok: false, error: "Utakmica ne postoji." };
  if (match.status !== "upcoming" || Date.now() >= match.kickoff) {
    return { ok: false, error: "Utakmica je zaključana — izazov više nije moguć." };
  }
  if (!myPick) return { ok: false, error: "Prvo predaj svoj tip — izazov se igra tvojim tipom." };
  if (!targetSnap.exists) return { ok: false, error: "Protivnik nema predani tip." };

  const pick = myPick.pick;
  const targetPick = (targetSnap.data() as PredictionDoc).pick;
  if (pick[0] === targetPick[0] && pick[1] === targetPick[1]) {
    return { ok: false, error: "Imate isti tip — takav izazov nije moguć." };
  }

  const week = match.week;
  const tokensPerWeek = tokensForWeek(cfg, week);
  const stake = cfg?.duelStake ?? DEFAULT_STAKE;
  const tokenRef = adminDb.collection(COLLECTIONS.tokenBalances).doc(tokenBalanceId(uid, week));
  const duelId = `${matchId}_${uid}_${targetUid}`;
  const duelRef = adminDb.collection(COLLECTIONS.duels).doc(duelId);
  const matchDuels = adminDb.collection(COLLECTIONS.duels).where("matchId", "==", matchId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const [tokenDoc, existing] = await Promise.all([tx.get(tokenRef), tx.get(matchDuels)]);
      // At most one duel per player per match — covers duplicate, reverse (B→A
      // after A→B), and multi-opponent cases, so scoring overrides never collide.
      const conflict = existing.docs.some((doc) => {
        const x = doc.data() as DuelDoc;
        return (
          [x.challengerUid, x.opponentUid].includes(uid) ||
          [x.challengerUid, x.opponentUid].includes(targetUid)
        );
      });
      if (conflict) throw new Error("DUP");
      const remaining = tokenDoc.exists ? (tokenDoc.data() as { remaining: number }).remaining : tokensPerWeek;
      if (remaining <= 0) throw new Error("NO_TOKENS");

      tx.set(tokenRef, { id: tokenBalanceId(uid, week), uid, week, remaining: remaining - 1 });
      const duel: DuelDoc = {
        id: duelId,
        matchId,
        week,
        challengerUid: uid,
        opponentUid: targetUid,
        challengerPick: [pick[0], pick[1]],
        opponentPick: targetPick,
        stake,
        status: "active",
        winnerUid: null,
        resolvedAt: null,
      };
      tx.set(duelRef, duel);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DUP") return { ok: false, error: "Već postoji izazov na ovoj utakmici za tebe ili protivnika." };
    if (msg === "NO_TOKENS") return { ok: false, error: "Nemaš više izazova ovaj tjedan." };
    return { ok: false, error: "Izazov nije uspio. Pokušaj ponovno." };
  }

  revalidatePath("/izazovi");
  revalidatePath(`/match/${matchId}`);
  return { ok: true };
}
