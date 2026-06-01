import { type NextRequest } from "next/server";
import { removeAuthCookies } from "next-firebase-auth-edge/next/cookies";
import { authConfig } from "@/lib/auth/config";
import { getSessionTokens } from "@/lib/server/session";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  // Revoke refresh tokens so the session can't be refreshed after logout
  // (the in-cookie ID token then dies within ~1h instead of lingering for days).
  try {
    const tokens = await getSessionTokens();
    if (tokens) await adminAuth.revokeRefreshTokens(tokens.decodedToken.uid);
  } catch {
    // best-effort; still clear the cookie below
  }
  return removeAuthCookies(request.headers, {
    cookieName: authConfig.cookieName,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
  });
}
