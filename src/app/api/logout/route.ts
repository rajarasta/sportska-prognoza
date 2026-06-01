import { type NextRequest } from "next/server";
import { removeAuthCookies } from "next-firebase-auth-edge/next/cookies";
import { authConfig } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  return removeAuthCookies(request.headers, {
    cookieName: authConfig.cookieName,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
  });
}
