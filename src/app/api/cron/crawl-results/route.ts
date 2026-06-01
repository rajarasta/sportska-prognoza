import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { crawlAndApply } from "@/lib/server/results-crawler/crawler";

// Node runtime — firebase-admin + the crawler need it. Never statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared-secret gate. The caller (Cloud Scheduler, cron-job.org, a manual curl)
// must present CRON_SECRET via `Authorization: Bearer <secret>`, an
// `x-cron-secret` header, or a `?secret=` query param. If the env var is unset we
// fail closed (503) rather than running unauthenticated.
function authorize(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false, status: 503, error: "cron-secret-not-configured" };

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  const provided =
    bearer ?? request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");

  if (provided !== expected) return { ok: false, status: 401, error: "unauthorized" };
  return { ok: true };
}

async function handle(request: NextRequest) {
  const gate = authorize(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const force = request.nextUrl.searchParams.get("force") === "1";

  try {
    const summary = await crawlAndApply(adminDb, { dryRun, force });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "crawl-failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST is the canonical trigger; GET is allowed for easy manual/browser checks.
export const POST = handle;
export const GET = handle;
