import { type NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "next-firebase-auth-edge/next/cookies";
import { authConfig } from "@/lib/auth/config";
import { adminAuth } from "@/lib/firebase/admin";
import { isEmailAllowed } from "@/lib/server/allowlist";
import { provisionUser } from "@/lib/server/users";

// Node runtime (default for route handlers) — firebase-admin is available here.
// This is the single choke point that enforces the email allowlist BEFORE any
// session cookie is issued.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!idToken) {
    return NextResponse.json({ error: "missing-token" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  // Only trust an email the IdP actually proved the caller owns: a verified
  // Google sign-in. This is the sole authorization choke point, so reject any
  // unverified / non-Google token before the allowlist check (defense-in-depth
  // against another provider being enabled later and self-asserting an email).
  if (!decoded.email_verified || decoded.firebase?.sign_in_provider !== "google.com") {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  const email = decoded.email?.toLowerCase() ?? null;
  if (!email || !(await isEmailAllowed(email))) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  await provisionUser(decoded);

  // Mints id+refresh cookies from the Authorization header token.
  return setAuthCookies(request.headers, {
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
    serviceAccount: authConfig.serviceAccount,
    enableMultipleCookies: authConfig.enableMultipleCookies,
  });
}
