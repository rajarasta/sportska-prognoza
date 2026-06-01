import "server-only";

// Firebase Admin SDK — server only (server actions, route handlers, server components).
// Credentials:
//   • Production (App Hosting): Application Default Credentials from the backend's
//     compute service account — initializeApp() with no args picks them up.
//   • Local: GOOGLE_APPLICATION_CREDENTIALS (set in .env.local) points at the
//     gitignored service-account JSON; ADC reads it the same way.
import { getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const app: App = getApps().length ? getApp() : initializeApp();

// getFirestore caches per-app, but Firestore.settings() may be called only once
// per instance — guard across Next.js hot reloads with a global singleton.
const globalForAdmin = globalThis as unknown as {
  __adminDb?: Firestore;
};

let db = globalForAdmin.__adminDb;
if (!db) {
  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  globalForAdmin.__adminDb = db;
}

export const adminApp: App = app;
export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = db;
