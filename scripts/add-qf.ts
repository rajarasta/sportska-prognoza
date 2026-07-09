// Local-only helper: insert Quarter-final (Četvrtfinale) fixtures into production
// Firestore so players can predict them. Dry-run by default; pass --commit to write.
//
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/add-qf.ts
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/add-qf.ts --commit
//
// Never overwrites an existing match doc (skips ids already present). Writes only
// the 4 QF fixtures — does NOT touch earlier rounds, predictions or config.
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { kickoffMs } from "../src/lib/data/season";
import { TEAMS, UNKNOWN_TEAM } from "../src/lib/data/teams";
import { COLLECTIONS } from "../src/lib/collections";
import type { MatchDoc } from "../src/lib/types";

const STAGE = "QF";
const WEEK = 4; // same weekly bucket as R32/R16 (season.ts defines no week 5)

// Bracket order (home = winner of the lower R16 match number), Zagreb local time.
// QF1 = W89 vs W90, QF2 = W91 vs W92, QF3 = W93 vs W94, QF4 = W95 vs W96.
// "03:00" = kicks off past midnight (NA evening) — note the date rolls over.
const ROWS: ReadonlyArray<{ no: number; date: string; time: string; home: string; away: string }> = [
  { no: 97, date: "2026-07-09", time: "22:00", home: "MAR", away: "FRA" }, // Maroko – Francuska
  { no: 98, date: "2026-07-11", time: "23:00", home: "NOR", away: "ENG" }, // Norveška – Engleska
  { no: 99, date: "2026-07-10", time: "21:00", home: "ESP", away: "BEL" }, // Španjolska – Belgija
  { no: 100, date: "2026-07-12", time: "03:00", home: "ARG", away: "SUI" }, // Argentina – Švicarska (11. srp 21:00 ET → 12. srp 03:00 Zagreb)
];

const teamName = (code: string) => (TEAMS[code] ?? UNKNOWN_TEAM).name;

const MATCHES: MatchDoc[] = ROWS.map((r) => ({
  id: `m${String(r.no).padStart(3, "0")}`,
  no: r.no,
  group: STAGE,
  stage: "knockout",
  date: r.date,
  time: r.time,
  kickoff: kickoffMs(r.date, r.time),
  week: WEEK,
  home: r.home,
  away: r.away,
  status: "upcoming",
  res: null,
  extraTimeRes: null,
  penaltyRes: null,
  winner: null,
}));

async function main() {
  const commit = process.argv.includes("--commit");
  const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  for (const m of MATCHES) {
    if (!TEAMS[m.home]) throw new Error(`Unknown team code "${m.home}" (${m.id})`);
    if (!TEAMS[m.away]) throw new Error(`Unknown team code "${m.away}" (${m.id})`);
  }

  const existing = await db.collection(COLLECTIONS.matches).get();
  const have = new Set(existing.docs.map((d) => d.id));

  const toWrite: MatchDoc[] = [];
  for (const m of MATCHES) {
    const dup = have.has(m.id);
    const when = new Date(m.kickoff).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    console.log(
      `  ${m.id} #${m.no}  ${teamName(m.home)} – ${teamName(m.away)}  →  ${when}` +
        (dup ? "   ⚠ VEĆ POSTOJI — preskačem" : ""),
    );
    if (!dup) toWrite.push(m);
  }

  if (!commit) {
    console.log(`\n[DRY-RUN] ${toWrite.length} novih utakmica bi se dodalo. Dodaj --commit za stvarni upis.`);
    return;
  }

  if (toWrite.length === 0) {
    console.log("\nNema ništa za dodati — sve već postoje.");
    return;
  }

  const batch = db.batch();
  for (const m of toWrite) batch.set(db.collection(COLLECTIONS.matches).doc(m.id), m);
  await batch.commit();
  console.log(`\n✓ Dodano ${toWrite.length} QF utakmica. Igrači ih sad mogu tipovati.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("add-qf failed:", e);
    process.exit(1);
  },
);
