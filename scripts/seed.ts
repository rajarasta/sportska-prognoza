// One-time / idempotent Firestore seed: teams, fixtures, league config.
// Run with:  GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run seed
// Re-running is safe: fixtures already marked `final` keep their result.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NAME_TO_CODE, teamDocs } from "../src/lib/data/teams";
import { weekOf, ddmmyyyyToIso, kickoffMs, WEEKS, SEASON } from "../src/lib/data/season";
import { FRIENDLY_MATCHES } from "../src/lib/data/test-run";
import { COLLECTIONS, CONFIG_DOC_ID } from "../src/lib/collections";
import type { LeagueConfigDoc, MatchDoc, Scoreline } from "../src/lib/types";

const app = getApps().length ? getApps()[0] : initializeApp(); // ADC
const db = getFirestore(app);

// Kickoff time slots assigned per match index within a day (placeholders the
// admin can refine — the schedule file carries no kickoff times).
const SLOTS = ["13:00", "15:00", "17:00", "18:00", "20:00", "21:00"];

const LINE_RE = /^(\d+)\s+(\d{2}\.\d{2}\.\d{4})\s+([A-L])\s+(.+?)\s+–\s+(.+?)\s*$/;

function parseSchedule(): MatchDoc[] {
  const file = join(process.cwd(), "data", "grupna-faza.txt");
  const rows = readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = LINE_RE.exec(line);
      if (!m) throw new Error(`Cannot parse schedule line: "${line}"`);
      const [, no, date, group, homeName, awayName] = m;
      return { no: Number(no), iso: ddmmyyyyToIso(date), group, homeName: homeName.trim(), awayName: awayName.trim() };
    })
    .sort((a, b) => a.no - b.no);

  const perDay: Record<string, number> = {};
  return rows.map((r) => {
    const idx = perDay[r.iso] ?? 0;
    perDay[r.iso] = idx + 1;
    const time = SLOTS[Math.min(idx, SLOTS.length - 1)];
    const home = NAME_TO_CODE[r.homeName];
    const away = NAME_TO_CODE[r.awayName];
    if (!home) throw new Error(`Unknown team name "${r.homeName}" (match ${r.no})`);
    if (!away) throw new Error(`Unknown team name "${r.awayName}" (match ${r.no})`);
    return {
      id: `m${String(r.no).padStart(3, "0")}`,
      no: r.no,
      group: r.group,
      date: r.iso,
      time,
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
