"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail } from "@/lib/server/allowlist";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import type { AllowlistDoc } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admin: invite a player by adding their email to the allowlist. */
export async function addAllowlistEmail(emailRaw: string, name?: string): Promise<ActionResult> {
  const { email: adminEmail } = await requireUser();
  if (!isAdminEmail(adminEmail)) return { ok: false, error: "Samo administrator." };

  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Neispravna email adresa." };

  const doc: AllowlistDoc = { email, name: name?.trim() || null, addedAt: Date.now() };
  await adminDb.collection(COLLECTIONS.allowlist).doc(email).set(doc, { merge: true });
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin: remove a player's allowlist entry. */
export async function removeAllowlistEmail(emailRaw: string): Promise<ActionResult> {
  const { email: adminEmail } = await requireUser();
  if (!isAdminEmail(adminEmail)) return { ok: false, error: "Samo administrator." };

  const email = emailRaw.trim().toLowerCase();
  await adminDb.collection(COLLECTIONS.allowlist).doc(email).delete();
  revalidatePath("/admin");
  return { ok: true };
}
