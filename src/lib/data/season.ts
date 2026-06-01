// Season calendar + Croatian date helpers (pure; no firebase).
// The group stage spans 11–27 June 2026, which maps cleanly to its 3 rounds.
import type { WeekDef } from "@/lib/types";

export const SEASON = "SP 2026";

export const WEEKS: WeekDef[] = [
  { n: 1, label: "Tjedan 1", range: "11.–17. lip", start: "2026-06-11", end: "2026-06-17" },
  { n: 2, label: "Tjedan 2", range: "18.–23. lip", start: "2026-06-18", end: "2026-06-23" },
  { n: 3, label: "Tjedan 3", range: "24.–27. lip", start: "2026-06-24", end: "2026-06-27" },
];

export const MONTHS = ["sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"];
export const MONTHS_FULL = [
  "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
  "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
];
export const WD_FULL = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
// Monday-first weekday header for the calendar grid.
export const WD_SHORT_MON = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

export function dParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** JS weekday (0=Sun..6=Sat) for an ISO date. */
export function weekdayOf(iso: string): number {
  const { y, m, d } = dParts(iso);
  return new Date(y, m - 1, d).getDay();
}

/** "13. lip" */
export function croShort(iso: string): string {
  const { m, d } = dParts(iso);
  return `${d}. ${MONTHS[m - 1]}`;
}

/** "Danas" / "Sutra" / "Jučer" / "Utorak, 16. lip" relative to `todayIso`. */
export function dayHeading(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Danas";
  const diff = Math.round(
    (Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayIso}T00:00:00`)) / 86400000,
  );
  if (diff === 1) return "Sutra";
  if (diff === -1) return "Jučer";
  return `${WD_FULL[weekdayOf(iso)]}, ${croShort(iso)}`;
}

/** Week number (1..3) for a fixture date. */
export function weekOf(iso: string): number {
  const w = WEEKS.find((w) => iso >= w.start && iso <= w.end);
  return w ? w.n : 1;
}

/** Convert "DD.MM.YYYY" (schedule file) → "YYYY-MM-DD". */
export function ddmmyyyyToIso(s: string): string {
  const [d, m, y] = s.trim().split(".").map((x) => x.trim());
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Kickoff epoch (ms) for a fixture, interpreting the local time as Europe/Zagreb
 *  (CEST = UTC+2 in June). */
export function kickoffMs(iso: string, time: string): number {
  return Date.parse(`${iso}T${time}:00+02:00`);
}
