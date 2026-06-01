// All 48 nations in the 2026 group stage (per grupna-faza.txt).
// code → { name (Croatian), c1/c2 gradient for the CSS badge }.
// Gradients bias toward darker/saturated tones so the white FIFA code stays legible.
import type { TeamDoc } from "@/lib/types";

export const TEAMS: Record<string, { name: string; c1: string; c2: string }> = {
  MEX: { name: "Meksiko", c1: "#006847", c2: "#00482F" },
  RSA: { name: "Južna Afrika", c1: "#007A4D", c2: "#00502F" },
  KOR: { name: "Južna Koreja", c1: "#C8102E", c2: "#8A0A1E" },
  CZE: { name: "Češka", c1: "#11457E", c2: "#0A2D54" },
  CAN: { name: "Kanada", c1: "#D52B1E", c2: "#8F1D14" },
  BIH: { name: "Bosna i Hercegovina", c1: "#002F6C", c2: "#001F47" },
  USA: { name: "SAD", c1: "#0A3161", c2: "#06203F" },
  PAR: { name: "Paragvaj", c1: "#D52B1E", c2: "#8F1D14" },
  HAI: { name: "Haiti", c1: "#00209F", c2: "#001466" },
  SCO: { name: "Škotska", c1: "#0065BF", c2: "#00396B" },
  AUS: { name: "Australija", c1: "#00843D", c2: "#00592A" },
  TUR: { name: "Turska", c1: "#E30A17", c2: "#990710" },
  BRA: { name: "Brazil", c1: "#1FA35A", c2: "#0C7A3F" },
  MAR: { name: "Maroko", c1: "#C1272D", c2: "#7A1418" },
  QAT: { name: "Katar", c1: "#8A1538", c2: "#5C0E25" },
  SUI: { name: "Švicarska", c1: "#D52B1E", c2: "#8F1D14" },
  CIV: { name: "Obala Bjelokosti", c1: "#F77F00", c2: "#B85C00" },
  ECU: { name: "Ekvador", c1: "#0033A0", c2: "#00216B" },
  GER: { name: "Njemačka", c1: "#2B2B2B", c2: "#000000" },
  CUW: { name: "Curaçao", c1: "#002B7F", c2: "#001B54" },
  NED: { name: "Nizozemska", c1: "#F36C21", c2: "#B84A0E" },
  JPN: { name: "Japan", c1: "#1F2A6E", c2: "#0E1640" },
  SWE: { name: "Švedska", c1: "#006AA7", c2: "#00466E" },
  TUN: { name: "Tunis", c1: "#E70013", c2: "#99000D" },
  KSA: { name: "Saudijska Arabija", c1: "#006C35", c2: "#004A24" },
  URU: { name: "Urugvaj", c1: "#4EA8DE", c2: "#2E7CAB" },
  ESP: { name: "Španjolska", c1: "#C60B1E", c2: "#860612" },
  CPV: { name: "Zelenortski Otoci", c1: "#003893", c2: "#00255E" },
  IRN: { name: "Iran", c1: "#239F40", c2: "#15692A" },
  NZL: { name: "Novi Zeland", c1: "#00247D", c2: "#001751" },
  BEL: { name: "Belgija", c1: "#C8102E", c2: "#8A0A1E" },
  EGY: { name: "Egipat", c1: "#CE1126", c2: "#8A0B19" },
  FRA: { name: "Francuska", c1: "#1C3FAA", c2: "#0E2470" },
  SEN: { name: "Senegal", c1: "#00853F", c2: "#00592A" },
  IRQ: { name: "Irak", c1: "#007A3D", c2: "#00502A" },
  NOR: { name: "Norveška", c1: "#BA0C2F", c2: "#7D081F" },
  ARG: { name: "Argentina", c1: "#62A9DE", c2: "#2E6FA8" },
  ALG: { name: "Alžir", c1: "#006233", c2: "#00401F" },
  AUT: { name: "Austrija", c1: "#ED2939", c2: "#9E1A26" },
  JOR: { name: "Jordan", c1: "#007A3D", c2: "#00502A" },
  GHA: { name: "Gana", c1: "#006B3F", c2: "#00472A" },
  PAN: { name: "Panama", c1: "#DA121A", c2: "#910C11" },
  ENG: { name: "Engleska", c1: "#1E2A52", c2: "#0C1530" },
  CRO: { name: "Hrvatska", c1: "#E4002B", c2: "#A60D1F" },
  POR: { name: "Portugal", c1: "#046A38", c2: "#024524" },
  COD: { name: "DR Kongo", c1: "#007FFF", c2: "#0059B3" },
  UZB: { name: "Uzbekistan", c1: "#1EB53A", c2: "#138527" },
  COL: { name: "Kolumbija", c1: "#1C3FAA", c2: "#0E2470" },

  // Non-WC nations — used only by the pre-WC trial round (international friendlies).
  MDV: { name: "Maldivi", c1: "#D21034", c2: "#8A0A1E" },
  AFG: { name: "Afganistan", c1: "#BE0000", c2: "#7A0000" },
  SVK: { name: "Slovačka", c1: "#0B4EA2", c2: "#07306B" },
  MLT: { name: "Malta", c1: "#CF142B", c2: "#8A0A1E" },
  BUL: { name: "Bugarska", c1: "#00966E", c2: "#00674C" },
  MNE: { name: "Crna Gora", c1: "#C40308", c2: "#8A0205" },
};

/** Croatian display name → FIFA code (for parsing the schedule file). */
export const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(TEAMS).map(([code, t]) => [t.name, code]),
);

/** Fallback team for unknown codes (keeps the UI rendering). */
export const UNKNOWN_TEAM = { name: "?", c1: "#888", c2: "#555" };

export function teamDocs(): TeamDoc[] {
  return Object.entries(TEAMS).map(([code, t]) => ({ code, ...t }));
}
