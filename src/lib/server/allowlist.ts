import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";

const adminEmails = (process.env.LEAGUE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

/** A user may enter the league if they are an admin or on the Firestore allowlist. */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const e = email.toLowerCase();
  if (isAdminEmail(e)) return true;
  const snap = await adminDb.collection(COLLECTIONS.allowlist).doc(e).get();
  return snap.exists;
}
