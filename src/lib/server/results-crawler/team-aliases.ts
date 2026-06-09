// Maps our internal FIFA-style team codes to the names external results/live-score
// sources use, so crawled events (finals) and scraped live snapshots can be matched
// back to our fixtures.
//
// The Croatian display name (from TEAMS) is ALWAYS consulted automatically, so this
// table only needs the English exonyms + common variants per code. That keeps a
// Croatian live-score source (the live pipeline's default) working out of the box
// while still resolving English/international feeds (e.g. TheSportsDB).
import { TEAMS } from "@/lib/data/teams";

/** English exonyms + spelling variants per code (Croatian name is added from TEAMS). */
export const PROVIDER_TEAM_NAMES: Record<string, string[]> = {
  // ── 2026 group stage (48) ──
  MEX: ["Mexico"],
  RSA: ["South Africa"],
  KOR: ["South Korea", "Korea Republic", "Korea"],
  CZE: ["Czechia", "Czech Republic"],
  CAN: ["Canada"],
  BIH: ["Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia"],
  USA: ["United States", "USA", "United States of America"],
  PAR: ["Paraguay"],
  HAI: ["Haiti"],
  SCO: ["Scotland"],
  AUS: ["Australia"],
  TUR: ["Turkey", "Türkiye", "Turkiye"],
  BRA: ["Brazil"],
  MAR: ["Morocco"],
  QAT: ["Qatar"],
  SUI: ["Switzerland"],
  CIV: ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
  ECU: ["Ecuador"],
  GER: ["Germany"],
  CUW: ["Curacao", "Curaçao"],
  NED: ["Netherlands", "Holland"],
  JPN: ["Japan"],
  SWE: ["Sweden"],
  TUN: ["Tunisia"],
  KSA: ["Saudi Arabia"],
  URU: ["Uruguay"],
  ESP: ["Spain"],
  CPV: ["Cape Verde", "Cabo Verde", "Cape Verde Islands"],
  IRN: ["Iran", "IR Iran"],
  NZL: ["New Zealand"],
  BEL: ["Belgium"],
  EGY: ["Egypt"],
  FRA: ["France"],
  SEN: ["Senegal"],
  IRQ: ["Iraq"],
  NOR: ["Norway"],
  ARG: ["Argentina"],
  ALG: ["Algeria"],
  AUT: ["Austria"],
  JOR: ["Jordan"],
  GHA: ["Ghana"],
  PAN: ["Panama"],
  ENG: ["England"],
  CRO: ["Croatia"],
  POR: ["Portugal"],
  COD: ["DR Congo", "Congo DR", "Democratic Republic of the Congo", "Congo-Kinshasa"],
  UZB: ["Uzbekistan"],
  COL: ["Colombia"],

  // ── Non-WC nations — pre-WC trial round (international friendlies) ──
  MDV: ["Maldives"],
  AFG: ["Afghanistan"],
  SVK: ["Slovakia"],
  MLT: ["Malta"],
  BUL: ["Bulgaria"],
  MNE: ["Montenegro"],
};

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD") // split accented letters into base + combining mark
    .replace(/[^a-z0-9]/g, ""); // drop spaces, punctuation and the combining marks

/** All known aliases for a code: its Croatian display name (TEAMS) + English variants. */
export function aliasesForCode(code: string): string[] {
  const cro = TEAMS[code]?.name;
  const en = PROVIDER_TEAM_NAMES[code] ?? [];
  return cro ? [cro, ...en] : en;
}

/** Does an external (provider/site) team-name refer to our `code`? */
export function nameMatchesCode(code: string, providerName: string): boolean {
  const aliases = aliasesForCode(code);
  if (aliases.length === 0) return false;
  const target = norm(providerName);
  if (!target) return false;
  return aliases.some((a) => {
    const n = norm(a);
    if (!n) return false;
    return target === n || target.includes(n) || n.includes(target);
  });
}
