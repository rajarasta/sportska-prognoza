import { kickoffMs, weekOf } from "@/lib/data/season";
import type { MatchDoc } from "@/lib/types";

const STAGE = "R32";

const ROWS: ReadonlyArray<{
  no: number;
  date: string;
  time: string;
  home: string;
  away: string;
}> = [
  { no: 73, date: "2026-06-28", time: "21:00", home: "RSA", away: "CAN" }, // Juzna Afrika - Kanada
  { no: 74, date: "2026-06-29", time: "19:00", home: "BRA", away: "JPN" }, // Brazil - Japan
  { no: 75, date: "2026-06-29", time: "22:30", home: "GER", away: "PAR" }, // Njemacka - Paragvaj
  { no: 76, date: "2026-06-30", time: "03:00", home: "NED", away: "MAR" }, // Nizozemska - Maroko
  { no: 77, date: "2026-06-30", time: "19:00", home: "CIV", away: "NOR" }, // Obala Bjelokosti - Norveska
  { no: 78, date: "2026-06-30", time: "23:00", home: "FRA", away: "SWE" }, // Francuska - Svedska
  { no: 79, date: "2026-07-01", time: "03:00", home: "MEX", away: "ECU" }, // Meksiko - Ekvador
  { no: 80, date: "2026-07-01", time: "18:00", home: "ENG", away: "COD" }, // Engleska - DR Kongo
  { no: 81, date: "2026-07-01", time: "22:00", home: "BEL", away: "SEN" }, // Belgija - Senegal
  { no: 82, date: "2026-07-02", time: "02:00", home: "USA", away: "BIH" }, // SAD - Bosna i Hercegovina
  { no: 83, date: "2026-07-02", time: "21:00", home: "ESP", away: "AUT" }, // Spanjolska - Austrija
  { no: 84, date: "2026-07-03", time: "01:00", home: "POR", away: "CRO" }, // Portugal - Hrvatska
  { no: 85, date: "2026-07-03", time: "05:00", home: "SUI", away: "ALG" }, // Svicarska - Alzir
  { no: 86, date: "2026-07-03", time: "20:00", home: "AUS", away: "EGY" }, // Australija - Egipat
  { no: 87, date: "2026-07-04", time: "00:00", home: "ARG", away: "CPV" }, // Argentina - Zelenortski Otoci
  { no: 88, date: "2026-07-04", time: "03:30", home: "COL", away: "GHA" }, // Kolumbija - Gana
];

export const KNOCKOUT_MATCHES: MatchDoc[] = ROWS.map((r) => ({
  id: `m${String(r.no).padStart(3, "0")}`,
  no: r.no,
  group: STAGE,
  stage: "knockout",
  date: r.date,
  time: r.time,
  kickoff: kickoffMs(r.date, r.time),
  week: weekOf(r.date),
  home: r.home,
  away: r.away,
  status: "upcoming",
  res: null,
  extraTimeRes: null,
  penaltyRes: null,
  winner: null,
}));
