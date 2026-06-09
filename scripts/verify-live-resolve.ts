// Offline verifier for the live-score name→matchId resolver + snapshot schema.
// No Firestore: reconstructs the group-stage + friendly fixtures from the same
// schedule file/data the seed uses, then checks that a snapshot built from each
// fixture's Croatian names (as a Croatian live-score site would show them) — and a
// few English exonyms — resolves back to the exact match id. Run:
//   npx tsx scripts/verify-live-resolve.ts   (or: npm run verify:live)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAME_TO_CODE, TEAMS } from "../src/lib/data/teams";
import { ddmmyyyyToIso, weekOf, kickoffMs } from "../src/lib/data/season";
import { FRIENDLY_MATCHES } from "../src/lib/data/test-run";
import { indexMatchesByDate, resolveMatchId } from "../src/lib/server/live/resolve";
import { parseSnapshot, type Snapshot } from "../src/lib/server/live/schema";
import type { MatchDoc } from "../src/lib/types";

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
    return {
      id: `m${String(r.no).padStart(3, "0")}`,
      no: r.no,
      group: r.group,
      date: r.iso,
      time,
      kickoff: kickoffMs(r.iso, time),
      week: weekOf(r.iso),
      home: NAME_TO_CODE[r.homeName],
      away: NAME_TO_CODE[r.awayName],
      status: "upcoming",
      res: null,
    } satisfies MatchDoc;
  });
}

const matches = [...parseSchedule(), ...FRIENDLY_MATCHES];
const byDate = indexMatchesByDate(matches);

let fail = 0;
let pass = 0;

// 1. Croatian names (the live pipeline's default source language)
for (const m of matches) {
  const id = resolveMatchId(
    { home: TEAMS[m.home].name, away: TEAMS[m.away].name, date: m.date },
    byDate,
  );
  if (id === m.id) pass++;
  else {
    fail++;
    console.log(`✗ HR  ${m.id}  "${TEAMS[m.home].name} – ${TEAMS[m.away].name}"  →  ${id ?? "UNRESOLVED"}`);
  }
}

// 2. A spread of English exonyms (international feeds)
const EN: Record<string, string> = {
  KOR: "South Korea", GER: "Germany", NED: "Netherlands", CIV: "Ivory Coast",
  CZE: "Czechia", USA: "United States", SUI: "Switzerland", CPV: "Cape Verde",
  KSA: "Saudi Arabia", COD: "DR Congo", TUR: "Türkiye", ENG: "England",
};
for (const m of matches) {
  const home = EN[m.home] ?? TEAMS[m.home].name;
  const away = EN[m.away] ?? TEAMS[m.away].name;
  const id = resolveMatchId({ home, away, date: m.date }, byDate);
  if (id === m.id) pass++;
  else {
    fail++;
    console.log(`✗ EN  ${m.id}  "${home} – ${away}"  →  ${id ?? "UNRESOLVED"}`);
  }
}

// 3. Snapshot schema round-trips for a full matchday
const day = matches[0].date;
const snap: Snapshot = {
  version: 1,
  source: "verify",
  capturedAt: 1_700_000_000_000,
  date: day,
  fixtures: matches
    .filter((m) => m.date === day)
    .map((m) => ({ home: TEAMS[m.home].name, away: TEAMS[m.away].name, score: [1, 0] as [number, number], minute: 55, status: "live" as const })),
};
try {
  parseSnapshot(snap);
  console.log(`✓ schema: ${snap.fixtures.length}-fixture snapshot for ${day} validates`);
} catch (e) {
  fail++;
  console.log(`✗ schema: ${(e as Error).message}`);
}

console.log(`\nResolver: ${pass} passed, ${fail} failed (of ${matches.length} HR + ${matches.length} EN fixtures).`);
process.exit(fail === 0 ? 0 : 1);
