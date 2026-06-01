// Shared next-firebase-auth-edge configuration. Used by the Edge middleware AND
// the Node route handlers, so it must NOT import firebase-admin or fs — only env.

type ServiceAccountCreds = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "__session";

const signatureKeys = (process.env.AUTH_COOKIE_SIGNATURE_KEYS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const cookieSerializeOptions = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 12, // 12 days
};

// Locally we supply the service account explicitly (Edge runtime can't read ADC
// from a file). In production on App Hosting we OMIT it so the library uses the
// compute service account via the GCP metadata server (Application Default Creds).
function getServiceAccount(): ServiceAccountCreds | undefined {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return undefined;
}

export const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  cookieName: AUTH_COOKIE_NAME,
  cookieSignatureKeys: signatureKeys,
  cookieSerializeOptions,
  serviceAccount: getServiceAccount(),
  enableMultipleCookies: false,
};
