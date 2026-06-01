// Manual results crawl — fetch finished scores from the configured provider,
// mark matches final, and recompute. Mirrors scripts/seed.ts: builds its own
// Admin SDK Firestore handle from Application Default Credentials, so it imports
// only the dependency-injected crawler (no `server-only` modules).
//
// Run with (Node 22):
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> RESULTS_PROVIDER=mock \
//     MOCK_RESULTS='{"t001":[2,1],"t002":[0,0],"t003":[3,2]}' npm run crawl -- --dry-run --force
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> RESULTS_PROVIDER=thesportsdb npm run crawl
//
// Flags:
//   --dry-run   report what would change, write nothing
//   --force     also query matches whose kickoff hasn't passed yet (useful for mock tests)
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { crawlAndApply } from "../src/lib/server/results-crawler/crawler";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run") || args.has("--dry");
  const force = args.has("--force");

  const summary = await crawlAndApply(db, { dryRun, force });
  console.log(JSON.stringify(summary, null, 2));

  if (summary.dryRun) {
    console.log(`\n(dry run — no writes) ${summary.updated.length} match(es) would be marked final via "${summary.provider}".`);
  } else {
    console.log(
      `\n${summary.updated.length} match(es) marked final via "${summary.provider}"` +
        (summary.recomputed ? " + scores recomputed." : "."),
    );
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("Crawl failed:", e);
    process.exit(1);
  },
);
