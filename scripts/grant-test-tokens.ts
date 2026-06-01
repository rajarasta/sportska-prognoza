// Utility: hard-set every player's challenge-token balance for a week.
// Normally NOT needed — league config `tokensByWeek: { "0": 1 }` already makes
// absent balances default to 1 for the trial week. Use this only to RESET balances
// during testing (e.g. after players have spent tokens).
//
// Run with (Node 22):
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run grant:tokens          # week 0, 1 token
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run grant:tokens -- 0 2   # week 0, 2 tokens
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, tokenBalanceId } from "../src/lib/collections";
import type { TokenBalanceDoc, UserDoc } from "../src/lib/types";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);

async function main() {
  const week = Number(process.argv[2] ?? 0);
  const remaining = Number(process.argv[3] ?? 1);
  if (!Number.isInteger(week) || !Number.isInteger(remaining) || remaining < 0) {
    throw new Error(`Usage: grant:tokens [week] [remaining] — got week=${process.argv[2]} remaining=${process.argv[3]}`);
  }

  const users = await db.collection(COLLECTIONS.users).get();
  const batch = db.batch();
  users.forEach((d) => {
    const u = d.data() as UserDoc;
    const doc: TokenBalanceDoc = { id: tokenBalanceId(u.uid, week), uid: u.uid, week, remaining };
    batch.set(db.collection(COLLECTIONS.tokenBalances).doc(doc.id), doc);
  });
  await batch.commit();

  console.log(`Set ${remaining} token(s) for week ${week} on ${users.size} user(s).`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("grant:tokens failed:", e);
    process.exit(1);
  },
);
