// Pre-WC trial round — international friendlies played on 2026-06-01.
// These are NOT World Cup fixtures: they carry no group, live in week 0, and are
// flagged `friendly` so the UI labels them "Prijateljska" instead of "Grupa X".
// Seeded by scripts/seed.ts alongside the parsed group-stage schedule.
import { kickoffMs } from "@/lib/data/season";
import type { MatchDoc } from "@/lib/types";

const DATE = "2026-06-01";
const TIME = "18:00";

/** [no, id, homeCode, awayCode] for each trial friendly. */
const ROWS: ReadonlyArray<[number, string, string, string]> = [
  [901, "t001", "MDV", "AFG"], // Maldivi – Afganistan
  [902, "t002", "SVK", "MLT"], // Slovačka – Malta
  [903, "t003", "BUL", "MNE"], // Bugarska – Crna Gora
];

export const FRIENDLY_MATCHES: MatchDoc[] = ROWS.map(([no, id, home, away]) => ({
  id,
  no,
  group: "",
  date: DATE,
  time: TIME,
  kickoff: kickoffMs(DATE, TIME),
  week: 0,
  home,
  away,
  status: "upcoming",
  res: null,
  friendly: true,
}));
