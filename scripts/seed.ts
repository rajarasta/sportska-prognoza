// One-time / idempotent Firestore seed: teams, fixtures, league config.
// Run with:  GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run seed
// Re-running is safe: fixtures already marked `final` keep their result.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NAME_TO_CODE, teamDocs } from "../src/lib/data/teams";
import { weekOf, ddmmyyyyToIso, kickoffMs, clockTime, WEEKS, SEASON } from "../src/lib/data/season";
import { FRIENDLY_MATCHES } from "../src/lib/data/test-run";
import { COLLECTIONS, CONFIG_DOC_ID } from "../src/lib/collections";
import type { LeagueConfigDoc, MatchDoc, Scoreline } from "../src/lib/types";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);

// Schedule line: no, matchday, kickoff "HH:MM" in Zagreb time (a "+1" suffix =
// kicks off past midnight, the day after the matchday), group, home – away.
const LINE_RE = /^(\d+)\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}(?:\+1)?)\s+([A-L])\s+(.+?)\s+–\s+(.+?)\s*$/;

function parseSchedule(): MatchDoc[] {
  const file = join(process.cwd(), "data", "grupna-faza.txt");
  const rows = readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = LINE_RE.exec(line);
      if (!m) throw new Error(`Cannot parse schedule line: "${line}"`);
      const [, no, date, time, group, homeName, awayName] = m;
      return { no: Number(no), iso: ddmmyyyyToIso(date), time, group, homeName: homeName.trim(), awayName: awayName.trim() };
    })
    .sort((a, b) => a.no - b.no);

  return rows.map((r) => {
    const time = r.time;
    const home = NAME_TO_CODE[r.homeName];
    const away = NAME_TO_CODE[r.awayName];
    if (!home) throw new Error(`Unknown team name "${r.homeName}" (match ${r.no})`);
    if (!away) throw new Error(`Unknown team name "${r.awayName}" (match ${r.no})`);
    return {
      id: `m${String(r.no).padStart(3, "0")}`,
      no: r.no,
      group: r.group,
      date: r.iso,
      time: clockTime(time),
      kickoff: kickoffMs(r.iso, time),
      week: weekOf(r.iso),
      home,
      away,
      status: "upcoming",
      res: null,
    } satisfies MatchDoc;
  });
}

async function main() {
  const teams = teamDocs();
  // Group-stage fixtures + the pre-WC trial friendlies (week 0).
  const matches = [...parseSchedule(), ...FRIENDLY_MATCHES];
  const config: LeagueConfigDoc = {
    sigma: 1.9,
    exactPoints: 3,
    goalBonus: 0.3,
    tokensPerWeek: 3,
    tokensByWeek: { "0": 1 }, // trial round: everyone gets exactly 1 Izazov token
    duelStake: 6,
    season: SEASON,
    weeks: WEEKS,
  };

  // Preserve already-played results across re-seeds.
  const existing = await db.collection(COLLECTIONS.matches).get();
  const played = new Map<string, { status: MatchDoc["status"]; res: Scoreline | null }>();
  existing.forEach((d) => {
    const m = d.data() as MatchDoc;
    if (m.status === "final") played.set(d.id, { status: "final", res: m.res ?? null });
  });

  const batch = db.batch();
  for (const t of teams) {
    batch.set(db.collection(COLLECTIONS.teams).doc(t.code), t);
  }
  for (const m of matches) {
    const keep = played.get(m.id);
    batch.set(
      db.collection(COLLECTIONS.matches).doc(m.id),
      keep ? { ...m, status: keep.status, res: keep.res } : m,
    );
  }
  batch.set(db.collection(COLLECTIONS.config).doc(CONFIG_DOC_ID), config);
  await batch.commit();

  console.log(
    `Seeded ${teams.length} teams, ${matches.length} matches (${played.size} kept final), config "${config.season}".`,
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  },
);
