// Season calendar + Croatian date helpers (pure; no firebase).
// The group stage spans 11-27 June 2026; knockout starts on 28 June.
import type { WeekDef } from "@/lib/types";

export const SEASON = "SP 2026";

export const WEEKS: WeekDef[] = [
  // Week 0 — the pre-WC trial round (international friendlies). Single-day window so
  // weekOf() returns 0 for these and they never collide with the group-stage weeks.
  { n: 0, label: "Probni krug", range: "Prijateljske · 1. lip", start: "2026-06-01", end: "2026-06-01" },
  { n: 1, label: "Tjedan 1", range: "11.–17. lip", start: "2026-06-11", end: "2026-06-17" },
  { n: 2, label: "Tjedan 2", range: "18.–23. lip", start: "2026-06-18", end: "2026-06-23" },
  { n: 3, label: "Tjedan 3", range: "24.–27. lip", start: "2026-06-24", end: "2026-06-27" },
  { n: 4, label: "Tjedan 4", range: "28. lip–4. srp", start: "2026-06-28", end: "2026-07-04" },
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

/** Week number for a fixture date. */
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
 *  (CEST = UTC+2 in June). A `+1` suffix ("04:00+1") means the match kicks off in
 *  the night AFTER its matchday — North American evening slots land past midnight
 *  here, so the matchday and the Zagreb calendar day differ. */
export function kickoffMs(iso: string, time: string): number {
  const plus = time.endsWith("+1");
  const hhmm = plus ? time.slice(0, -2) : time;
  const base = Date.parse(`${iso}T${hhmm}:00+02:00`);
  return plus ? base + 86400000 : base;
}

/** Strip the `+1` day-marker from a schedule time → the clock time to store/show. */
export function clockTime(time: string): string {
  return time.endsWith("+1") ? time.slice(0, -2) : time;
}

/** Zagreb-local calendar date (ISO) + clock time for an epoch ms. */
export function zagrebParts(ms: number): { iso: string; hhmm: string } {
  const d = new Date(ms);
  const iso = d.toLocaleDateString("en-CA", { timeZone: "Europe/Zagreb" });
  const hhmm = d.toLocaleTimeString("hr-HR", {
    timeZone: "Europe/Zagreb",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { iso, hhmm };
}

/** Kickoff display label vs the matchday: "21:00" when same-day, or
 *  "04:00 (12. lip)" when the match starts past midnight Zagreb time. */
export function kickoffLabel(matchdayIso: string, kickoff: number): string {
  const { iso, hhmm } = zagrebParts(kickoff);
  return iso === matchdayIso ? hhmm : `${hhmm} (${croShort(iso)})`;
}
