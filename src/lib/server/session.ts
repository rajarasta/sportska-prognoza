import "server-only";
import { cookies } from "next/headers";
import { getTokens, type Tokens } from "next-firebase-auth-edge";
import { authConfig } from "@/lib/auth/config";
import { getUser } from "./users";
import type { UserDoc } from "@/lib/types";

/** Verified session tokens for the current request, or null if signed out. */
export async function getSessionTokens(): Promise<Tokens | null> {
  const cookieStore = await cookies();
  return getTokens(cookieStore, {
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
    serviceAccount: authConfig.serviceAccount,
  });
}

export interface CurrentUser {
  uid: string;
  email: string;
  name: string;
  picture?: string | null;
  profile: UserDoc | null;
}

/** The authenticated user (token + profile doc). Throws if unauthenticated —
 *  routes are already gated by middleware, so this should always succeed there. */
export async function requireUser(): Promise<CurrentUser> {
  const tokens = await getSessionTokens();
  if (!tokens) throw new Error("UNAUTHENTICATED");
  const { uid, email, name, picture } = tokens.decodedToken;
  const profile = await getUser(uid);
  return {
    uid,
    email: (email ?? "").toLowerCase(),
    name: name ?? profile?.name ?? "Igrač",
    picture: picture ?? null,
    profile,
  };
}
