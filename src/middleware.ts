import { type NextRequest, NextResponse } from "next/server";
import {
  authMiddleware,
  redirectToHome,
  redirectToLogin,
} from "next-firebase-auth-edge";
import { authConfig } from "@/lib/auth/config";

const PUBLIC_PATHS = ["/login"];
const HOME = "/bodovi";

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
    serviceAccount: authConfig.serviceAccount,
    enableMultipleCookies: authConfig.enableMultipleCookies,
    handleValidToken: async (_tokens, headers) => {
      // Already signed in: keep them out of /login.
      if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
        return redirectToHome(request, { path: HOME });
      }
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async () => {
      return redirectToLogin(request, {
        path: "/login",
        publicPaths: PUBLIC_PATHS,
      });
    },
    handleError: async (error) => {
      console.error("[auth middleware]", error);
      return redirectToLogin(request, {
        path: "/login",
        publicPaths: PUBLIC_PATHS,
      });
    },
  });
}

export const config = {
  // Run on every route except Next internals, the login/logout API endpoints
  // (handled by our own route handlers), and static assets by extension. We
  // match on specific extensions (not "any dot") so dynamic route segments that
  // could contain a dot still get gated.
  matcher: [
    "/((?!_next|api/login|api/logout|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|avif|js|css|txt|xml|json|woff2?|map|webmanifest)$).*)",
  ],
};
