// Derive avatar initials + a stable color for a player. Pure (client + server).

const PALETTE = [
  "#E4002B", // red
  "#1C3FAA", // blue
  "#1FA35A", // green
  "#F36C21", // orange
  "#7C3AED", // violet
  "#0891B2", // cyan
  "#DB2777", // pink
  "#65A30D", // lime
  "#9A3412", // brown
  "#0E1116", // ink
  "#475569", // slate
  "#E09A00", // gold-dark
];

/** Two-letter uppercase initials from a display name (or email local part). */
export function initialsFrom(nameOrEmail: string): string {
  const base = (nameOrEmail || "").trim();
  if (!base) return "?";
  const namePart = base.includes("@") ? base.split("@")[0] : base;
  const words = namePart.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return namePart.slice(0, 2).toUpperCase();
}

/** Deterministic color from a stable key (uid/email) so it never changes. */
export function colorFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
