// Local-only: enter KNOCKOUT results (R32/R16/…) with full extra-time / penalty
// detail, mirroring src/app/actions/results.ts (normalizeKnockoutResult) — NOT the
// group-stage enter-results.ts, which only writes `res` and would leave `winner`,
// `extraTimeRes` and `penaltyRes` null. Those fields drive M2 knockout scoring
// (src/lib/scoring.ts) and the bracket display, so drawn-after-90 games MUST carry
// them. DRY-RUN by default; pass --commit to write + recompute.
//
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/enter-knockout-results.ts
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/enter-knockout-results.ts --commit
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../src/lib/collections";
import { runRecompute } from "../src/lib/server/recompute";
import { TEAMS, UNKNOWN_TEAM } from "../src/lib/data/teams";
import type { MatchDoc, Scoreline, MatchWinner } from "../src/lib/types";

const name = (c: string) => (TEAMS[c] ?? UNKNOWN_TEAM).name;

// Real 2026 WC knockout results. `res` = 90-minute score. For games level after 90,
// `extraTimeRes` = cumulative score after extra time; `penaltyRes` = shootout score
// [home, away]; `winner` = who advanced. Decisive games carry only `res` + `winner`.
type Row = {
  id: string;
  res: Scoreline;
  extraTimeRes?: Scoreline | null;
  penaltyRes?: Scoreline | null;
  winner: MatchWinner;
};

const ROWS: ReadonlyArray<Row> = [
  // --- Round of 32 (final three) ---
  { id: "m086", res: [1, 1], extraTimeRes: [0, 0], penaltyRes: [2, 4], winner: "away" }, // Australija–Egipat: 1-1, 0 ET goals, pen 2-4 → Egipat
  { id: "m087", res: [1, 1], extraTimeRes: [2, 1], winner: "home" }, // Argentina–Zel. Otoci: 1-1, ET goals 2-1 (final 3-2) → Argentina
  { id: "m088", res: [1, 0], winner: "home" }, // Kolumbija–Gana 1-0 → Kolumbija
  // --- Round of 16 (Osmina) ---
  { id: "m089", res: [0, 3], winner: "away" }, // Kanada–Maroko 0-3 → Maroko
  { id: "m090", res: [0, 1], winner: "away" }, // Paragvaj–Francuska 0-1 → Francuska
  { id: "m091", res: [1, 2], winner: "away" }, // Brazil–Norveška 1-2 → Norveška
  { id: "m092", res: [2, 3], winner: "away" }, // Meksiko–Engleska 2-3 → Engleska
  { id: "m093", res: [0, 1], winner: "away" }, // Portugal–Španjolska 0-1 → Španjolska
  { id: "m094", res: [1, 4], winner: "away" }, // SAD–Belgija 1-4 → Belgija
  { id: "m095", res: [3, 2], winner: "home" }, // Argentina–Egipat 3-2 → Argentina
  { id: "m096", res: [0, 0], extraTimeRes: [0, 0], penaltyRes: [4, 3], winner: "home" }, // Švicarska–Kolumbija: 0-0, pen 4-3 → Švicarska
];

const scoreWinner = (s: Scoreline): MatchWinner | null =>
  s[0] > s[1] ? "home" : s[1] > s[0] ? "away" : null;

// Validate each row's `winner` is consistent with its scores, exactly the way
// normalizeKnockoutResult would derive it — refuse to write anything inconsistent.
function deriveWinner(r: Row): MatchWinner {
  const w90 = scoreWinner(r.res);
  if (w90) return w90;
  if (!r.extraTimeRes) throw new Error(`${r.id}: 90' draw needs extraTimeRes`);
  const wEt = scoreWinner(r.extraTimeRes);
  if (wEt) return wEt;
  if (!r.penaltyRes) throw new Error(`${r.id}: ET draw needs penaltyRes`);
  const wPen = scoreWinner(r.penaltyRes);
  if (!wPen) throw new Error(`${r.id}: penaltyRes must have a winner`);
  return wPen;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const app = getApps().length ? getApps()[0] : initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const snaps = await Promise.all(
    ROWS.map((r) => db.collection(COLLECTIONS.matches).doc(r.id).get()),
  );

  const problems: string[] = [];
  const toWrite: Array<{ r: Row; m: MatchDoc }> = [];
  for (let i = 0; i < ROWS.length; i++) {
    const r = ROWS[i];
    const snap = snaps[i];
    if (!snap.exists) {
      problems.push(`${r.id}: NE POSTOJI`);
      continue;
    }
    const m = snap.data() as MatchDoc;
    const derived = deriveWinner(r);
    if (derived !== r.winner) {
      problems.push(`${r.id}: winner "${r.winner}" ≠ derived "${derived}" iz rezultata`);
      continue;
    }
    const advancer = r.winner === "home" ? m.home : m.away;
    const extra =
      (r.extraTimeRes ? `  ET ${r.extraTimeRes[0]}:${r.extraTimeRes[1]}` : "") +
      (r.penaltyRes ? `  PEN ${r.penaltyRes[0]}:${r.penaltyRes[1]}` : "");
    const cur = m.status === "final" && m.res ? `final ${m.res[0]}:${m.res[1]}` : m.status;
    console.log(
      `  ${r.id} #${m.no} [${m.group}]  ${name(m.home)} – ${name(m.away)}  →  ${r.res[0]}:${r.res[1]}${extra}  ⇒ prolazi ${name(advancer)}   (trenutno: ${cur})`,
    );
    toWrite.push({ r, m });
  }

  if (problems.length) {
    console.error("\n✗ Problemi:\n  " + problems.join("\n  "));
    process.exit(1);
  }

  if (!commit) {
    console.log(`\n[DRY-RUN] ${toWrite.length} rezultata bi se upisalo. Dodaj --commit za stvarni upis.\n`);
    return;
  }

  const batch = db.batch();
  for (const { r } of toWrite) {
    batch.update(db.collection(COLLECTIONS.matches).doc(r.id), {
      res: [r.res[0], r.res[1]],
      extraTimeRes: r.extraTimeRes ?? null,
      penaltyRes: r.penaltyRes ?? null,
      winner: r.winner,
      status: "final",
    });
  }
  await batch.commit();
  console.log(`\n✓ Upisano ${toWrite.length} rezultata. Pokrećem recompute…`);
  await runRecompute(db);
  console.log("✓ Recompute gotov — bodovi i ljestvica su ažurirani.\n");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("enter-knockout-results failed:", e);
    process.exit(1);
  },
);
