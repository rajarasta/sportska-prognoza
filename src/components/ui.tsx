// Shared presentational primitives — ported from the handoff (ui.jsx).
// No hooks/handlers, so they render in both server and client components.
import type { CSSProperties, ReactNode } from "react";
import { C, FONT } from "@/lib/tokens";
import { TEAMS, UNKNOWN_TEAM } from "@/lib/data/teams";
import { matchStageLabel } from "@/lib/matches";
import type { MatchStage } from "@/lib/types";

export function teamName(code: string): string {
  return (TEAMS[code] ?? UNKNOWN_TEAM).name;
}

/** Label for a match's competition slot. */
export function matchTag(m: { friendly?: boolean; group?: string; stage?: MatchStage }): string {
  return matchStageLabel(m);
}

/** Gradient circle with the FIFA code. */
export function TeamBadge({ code, size = 44 }: { code: string; size?: number }) {
  const t = TEAMS[code] ?? UNKNOWN_TEAM;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: `linear-gradient(150deg, ${t.c1}, ${t.c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: FONT.anton,
        fontSize: size * 0.34,
        letterSpacing: 0.5,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 2px 6px rgba(0,0,0,.16)",
        border: "2px solid #fff",
      }}
    >
      {code}
    </div>
  );
}

export interface PlayerLike {
  init: string;
  color: string;
}

/** Player initials avatar. */
export function Avatar({ p, size = 38, ring }: { p: PlayerLike; size?: number; ring?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: p.color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: size * 0.36,
        boxShadow: ring
          ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${ring}`
          : "inset 0 1px 0 rgba(255,255,255,.25)",
      }}
    >
      {p.init}
    </div>
  );
}

type ScoreTone = "ink" | "open" | "red" | "gold" | "green" | "ghost";

/** Scoreline chip [ a : b ]. */
export function Score({
  a,
  b,
  big,
  tone = "ink",
}: {
  a: number | null;
  b: number | null;
  big?: boolean;
  tone?: ScoreTone;
}) {
  const tones: Record<ScoreTone, { bg: string; fg: string; bd?: string }> = {
    ink: { bg: C.ink, fg: "#fff" },
    open: { bg: "#EEF0F4", fg: C.ink },
    red: { bg: C.red, fg: "#fff" },
    gold: { bg: C.gold, fg: C.ink },
    green: { bg: C.green, fg: "#fff" },
    ghost: { bg: "transparent", fg: C.ink, bd: "#D7DAE0" },
  };
  const c = tones[tone];
  const h = big ? 46 : 34;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: big ? 8 : 5,
        height: h,
        padding: `0 ${big ? 14 : 10}px`,
        borderRadius: 11,
        background: c.bg,
        color: c.fg,
        border: c.bd ? `1.5px solid ${c.bd}` : "none",
        fontFamily: FONT.anton,
        fontSize: big ? 30 : 20,
        lineHeight: 1,
        minWidth: h,
        letterSpacing: 0.5,
      }}
    >
      <span>{a ?? "–"}</span>
      <span style={{ opacity: 0.45, fontSize: big ? 20 : 14, transform: "translateY(-1px)" }}>:</span>
      <span>{b ?? "–"}</span>
    </div>
  );
}

type TagTone = "gray" | "red" | "gold" | "green" | "live";

export function Tag({
  children,
  tone = "gray",
  style,
}: {
  children: ReactNode;
  tone?: TagTone;
  style?: CSSProperties;
}) {
  const m: Record<TagTone, { bg: string; fg: string }> = {
    gray: { bg: "#EEF0F4", fg: "#5B6470" },
    red: { bg: C.redChipBg, fg: C.redChipFg },
    gold: { bg: C.goldTintBg, fg: C.goldText },
    green: { bg: C.greenTintBg, fg: C.greenText },
    live: { bg: C.red, fg: "#fff" },
  };
  const c = m[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: c.bg,
        color: c.fg,
        borderRadius: 7,
        padding: "4px 9px",
        fontFamily: FONT.archivo,
        fontWeight: 700,
        fontSize: 11.5,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "4px 2px 12px" }}>
      <div
        style={{
          fontFamily: FONT.archivo,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {children}
      </div>
      {right}
    </div>
  );
}

type BtnTone = "red" | "gold" | "dark" | "ghost";

export function BigButton({
  children,
  tone = "red",
  onClick,
  disabled,
  style,
  type = "button",
}: {
  children: ReactNode;
  tone?: BtnTone;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit";
}) {
  const m: Record<BtnTone, { bg: string; fg: string; sh: string; bd?: string }> = {
    red: { bg: C.red, fg: "#fff", sh: "0 8px 20px rgba(228,0,43,.32)" },
    gold: { bg: C.gold, fg: C.ink, sh: "0 8px 20px rgba(242,184,7,.34)" },
    dark: { bg: C.ink, fg: "#fff", sh: "0 8px 20px rgba(14,17,22,.25)" },
    ghost: { bg: "#fff", fg: C.ink, sh: "none", bd: "1.5px solid #E2E5EA" },
  };
  const c = m[tone];
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 54,
        border: c.bd || "none",
        borderRadius: 16,
        background: disabled ? C.disabledBtn : c.bg,
        color: disabled ? "#fff" : c.fg,
        boxShadow: disabled ? "none" : c.sh,
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: 16.5,
        letterSpacing: 0.3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
