// Manual full score recompute — rebuilds all derived data (prediction points,
// duel resolution, user totals/weekly/rank) from the source of truth. Mirrors
// scripts/crawl-results.ts: builds its own Admin SDK Firestore handle from
// Application Default Credentials, so it imports only the dependency-injected
// engine (no `server-only` modules).
//
// Run with (Node 22):
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run recompute
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { runRecompute } from "../src/lib/server/recompute";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

runRecompute(db).then(
  () => {
    console.log("Recompute done.");
    process.exit(0);
  },
  (e) => {
    console.error("Recompute failed:", e);
    process.exit(1);
  },
);
