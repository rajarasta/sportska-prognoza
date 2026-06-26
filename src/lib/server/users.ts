import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { initialsFrom, colorFor } from "@/lib/avatar";
import { applyNickname } from "@/lib/data/nicknames";
import { isAdminEmail } from "./allowlist";
import type { UserDoc } from "@/lib/types";

/** Create-or-refresh the user's profile doc on login. Aggregates are preserved. */
export async function provisionUser(decoded: DecodedIdToken): Promise<UserDoc> {
  const uid = decoded.uid;
  const email = (decoded.email ?? "").toLowerCase();
  const name = decoded.name ?? (email ? email.split("@")[0] : "Igrač");
  const ref = adminDb.collection(COLLECTIONS.users).doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const patch = {
      email,
      name,
      photoURL: decoded.picture ?? null,
      isAdmin: isAdminEmail(email),
    };
    await ref.set(patch, { merge: true });
    return { ...(snap.data() as UserDoc), ...patch };
  }

  const newUser: UserDoc = {
    uid,
    email,
    name,
    init: initialsFrom(name || email),
    color: colorFor(uid || email),
    isAdmin: isAdminEmail(email),
    photoURL: decoded.picture ?? null,
    createdAt: Date.now(),
    totalPoints: 0,
    exactCount: 0,
    weeklyPoints: {},
    bestWeekPoints: 0,
    rank: null,
    prevRank: null,
    duelsWon: 0,
    duelsLost: 0,
  };
  await ref.set(newUser);
  return newUser;
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await adminDb.collection(COLLECTIONS.users).doc(uid).get();
  return snap.exists ? applyNickname(snap.data() as UserDoc) : null;
}
