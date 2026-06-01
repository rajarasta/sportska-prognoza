// Maps our internal FIFA-style team codes to the English names external results
// providers use, so crawled events can be matched back to our fixtures.
//
// Only the codes the crawler currently needs are listed (the pre-WC trial
// friendlies). Add WC teams here when wiring automatic scoring for the tournament.

export const PROVIDER_TEAM_NAMES: Record<string, string[]> = {
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

/** Does an external event team-name refer to our `code`? */
export function nameMatchesCode(code: string, providerName: string): boolean {
  const aliases = PROVIDER_TEAM_NAMES[code];
  if (!aliases) return false;
  const target = norm(providerName);
  return aliases.some((a) => {
    const n = norm(a);
    return target === n || target.includes(n) || n.includes(target);
  });
}
