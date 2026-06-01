import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { runRecompute } from "@/lib/server/recompute";

/**
 * Full, idempotent recompute of all derived data using the server's Admin SDK
 * Firestore handle. Thin server-only wrapper around the dependency-injected
 * {@link runRecompute} so the same logic is reusable from a standalone CLI.
 */
export async function recomputeScores(): Promise<void> {
  await runRecompute(adminDb);
}
