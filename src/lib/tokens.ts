// ─────────────────────────────────────────────────────────────
// Design tokens — ported from the Fantasy Liga handoff (high-fidelity).
// Used as inline-style constants across components, mirroring the prototype.
// ─────────────────────────────────────────────────────────────

/** Colors */
export const C = {
  ink: "#0E1116",
  inkGrad: "linear-gradient(180deg,#0E1116,#23262E)",
  bg: "#F4F5F7",
  surface: "#FFFFFF",

  red: "#E4002B",
  redPressed: "#B4141F",
  redTintBg: "#FFF4F5",
  redChipBg: "#FDE7EA",
  redChipFg: "#C00B22",

  gold: "#F2B807",
  goldDark: "#E09A00",
  goldGrad: "linear-gradient(150deg,#F2B807,#E09A00)",
  goldTintBg: "#FFF3CC",
  goldTintBg2: "#FFF7E0",
  goldText: "#8A6A00",
  goldText2: "#6B5410",
  challengeHero: "linear-gradient(155deg,#1A1206,#3A2A0A)",
  challengeHero3: "linear-gradient(155deg,#1A1206,#2A1E08,#3A2A0A)",
  podiumGold: "linear-gradient(180deg,#FFE89A,#F2B807)",

  green: "#16A34A",
  greenTintBg: "#DCF5E6",
  greenText: "#11833F",

  muted: "#9AA1AD",
  muted2: "#8A92A0",
  muted3: "#6B7280",
  faint: "#B7BDC7",
  faint2: "#C2C7D0",
  faint3: "#CDD2DA",

  hairline: "#ECEEF2",
  hairline2: "#F1F2F5",
  hairline3: "#E7E9EE",

  disabledBtn: "#C9CDD4",
  white: "#FFFFFF",
} as const;

/** Font families (wired to next/font CSS variables in layout.tsx) */
export const FONT = {
  anton: "var(--font-anton), Impact, sans-serif",
  archivo: "var(--font-archivo), system-ui, sans-serif",
} as const;

/** Border radii */
export const R = {
  chip: 11,
  sm: 16,
  card: 18,
  lg: 22,
  sheet: 26,
  pill: 9999,
} as const;

/** Shadows */
export const SHADOW = {
  card: "0 1px 3px rgba(14,17,22,.05)",
  raised: "0 2px 8px rgba(14,17,22,.06)",
  fab: "0 10px 22px rgba(228,0,43,.4)",
  fabGold: "0 10px 22px rgba(242,184,7,.45)",
  drawer: "0 24px 44px rgba(14,17,22,.18)",
} as const;

/** Safe areas (px) — header top padding & space above the tab bar */
export const SAFE = {
  top: 56,
  nav: 108,
} as const;

/** App column width on larger screens (mobile-first). */
export const APP_MAX_WIDTH = 430;
