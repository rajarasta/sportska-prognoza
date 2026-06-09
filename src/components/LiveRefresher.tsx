"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While `active`, re-runs the current (force-dynamic, SSR) page on an interval via
 * router.refresh() — so live scores + provisional points appear without a manual
 * reload and WITHOUT opening Firestore client read rules. Renders nothing; gate it
 * on whether any match is currently live so it never polls idly.
 */
export default function LiveRefresher({
  active,
  intervalMs = 45000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
