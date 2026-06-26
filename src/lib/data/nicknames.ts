// League nicknames. Player names come from Google accounts and get refreshed on
// every login (provisionUser overwrites `name`), so a DB rename never sticks —
// instead we override at display time, matched by surname stem. Pure module
// (no firebase / no server-only): safe to import on client and server.
import { initialsFrom } from "@/lib/avatar";

/** Lowercase + strip Croatian diacritics so matching is spelling-tolerant. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // drop combining marks
    .toLowerCase()
    .replace(new RegExp("\\u0111", "g"), "d") // đ has no NFD decomposition
    .trim();
}

interface NickRule {
  sur: string; // normalized surname stem to match on
  first?: string; // normalized first-name stem, when the surname is shared
  nick: string;
}

// Stems are deliberately short so they survive spelling variants of the real
// Google name (e.g. "rasto" matches both Rastović and Rastočić). The two Zlodre
// brothers share a surname, so they're disambiguated by first name.
const RULES: NickRule[] = [
  { sur: "zder", nick: "Ždera" }, // Vedran Žderić
  { sur: "crn", nick: "Crni" }, // Crnčević
  { sur: "kres", nick: "Kreša" }, // Marijan Krešić
  { sur: "peric", nick: "Pera" }, // Perić
  { sur: "zlodre", first: "josip", nick: "Jozo" }, // Josip Zlodre
  { sur: "zlodre", first: "leo", nick: "Leo" }, // Leo Zlodre
  { sur: "obrvan", nick: "Linci" }, // Antonio Obrvan
  { sur: "rasto", nick: "Rasta" }, // Rastović / Rastočić
  { sur: "pavlov", first: "igor", nick: "Ćelo" }, // Igor Pavlović
];

/** Map a player's real (Google) name to their league nickname, or return it
 *  unchanged when no rule matches. Idempotent: nickname(nick) === nick. */
export function nickname(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "Igrač";
  const norm = normalize(raw);
  const tokens = norm.split(/[\s._-]+/).filter(Boolean);
  for (const r of RULES) {
    const surOk = tokens.some((t) => t.startsWith(r.sur)) || norm.includes(r.sur);
    if (!surOk) continue;
    if (r.first && !tokens.some((t) => t.startsWith(r.first!))) continue;
    return r.nick;
  }
  return raw;
}

/** Apply the nickname to a user-like record, re-deriving avatar initials from it.
 *  Returns the same object when no nickname applies. */
export function applyNickname<T extends { name: string; init?: string }>(u: T): T {
  const nick = nickname(u.name);
  if (nick === u.name) return u;
  return { ...u, name: nick, init: initialsFrom(nick) };
}
