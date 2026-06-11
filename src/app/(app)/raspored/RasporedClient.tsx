"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Score, Tag, TeamBadge, teamName, matchTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";
import { MONTHS_FULL, WD_SHORT_MON, croShort, dayHeading, kickoffLabel, weekOf } from "@/lib/data/season";
import Countdown from "@/components/Countdown";
import type { MatchView } from "@/lib/server/queries";
import type { WeekDef } from "@/lib/types";

type Mode = "dani" | "tjedni";

export default function RasporedClient({
  matches,
  weeks,
  today,
  nowMs,
}: {
  matches: MatchView[];
  weeks: WeekDef[];
  today: string;
  nowMs: number;
}) {
  const matchDates = useMemo(
    () => [...new Set(matches.map((m) => m.date))].sort(),
    [matches],
  );
  const defaultDay = useMemo(
    () => matchDates.find((d) => d >= today) ?? matchDates[matchDates.length - 1] ?? today,
    [matchDates, today],
  );

  const [mode, setMode] = useState<Mode>("dani");
  const [selDay, setSelDay] = useState(defaultDay);
  const [selWeek, setSelWeek] = useState(weekOf(defaultDay));
  const [open, setOpen] = useState(false);

  const shown =
    mode === "dani"
      ? matches.filter((m) => m.date === selDay)
      : matches.filter((m) => weekOf(m.date) === selWeek);

  const days: { date: string; items: MatchView[] }[] = [];
  shown.forEach((m) => {
    let d = days.find((x) => x.date === m.date);
    if (!d) {
      d = { date: m.date, items: [] };
      days.push(d);
    }
    d.items.push(m);
  });
  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  const weekDef = weeks.find((w) => w.n === selWeek);
  const main = mode === "dani" ? dayHeading(selDay, today) : `Tjedan ${selWeek}`;
  const sub =
    mode === "dani"
      ? `${croShort(selDay)} · ${shown.length} utakmica · termini po HR vremenu`
      : `${weekDef?.range ?? ""} · termini po HR vremenu`;

  const pickDay = (iso: string) => {
    setSelDay(iso);
    setMode("dani");
    setOpen(false);
  };
  const pickWeek = (n: number) => {
    setSelWeek(n);
    setMode("tjedni");
    setOpen(false);
  };

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      {/* sticky header + drawer */}
      <div style={{ position: "sticky", top: 0, zIndex: 45 }}>
        <div
          onClick={() => setOpen((o) => !o)}
          style={{
            background: C.surface,
            padding: `${SAFE.top}px 20px 16px`,
            cursor: "pointer",
            borderRadius: open ? 0 : "0 0 22px 22px",
            boxShadow: "0 1px 0 #ECEEF2",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: FONT.anton, fontSize: 30, letterSpacing: 0.5, color: C.ink }}>RASPORED</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.ink, color: "#fff", borderRadius: 12, padding: "9px 13px" }}>
              <Icon.cal s={17} />
              <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>{main}</span>
              <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s", display: "flex" }}>
                <Icon.chevDown s={13} />
              </span>
            </div>
          </div>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted, marginTop: 4 }}>{sub}</div>
        </div>

        {/* backdrop */}
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            height: "160vh",
            background: "rgba(14,17,22,.38)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity .25s",
            zIndex: 1,
          }}
        />

        {/* drawer */}
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 2,
            background: C.surface,
            borderRadius: "0 0 26px 26px",
            boxShadow: SHADOW.drawer,
            padding: "8px 18px 20px",
            transformOrigin: "top",
            transform: open ? "translateY(0)" : "translateY(-14px)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "transform .28s cubic-bezier(.2,.85,.25,1), opacity .2s",
          }}
        >
          <div style={{ display: "flex", gap: 6, background: C.bg, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {([["dani", "Po danima"], ["tjedni", "Po tjednima"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                style={{
                  flex: 1,
                  border: "none",
                  cursor: "pointer",
                  padding: "9px 0",
                  borderRadius: 9,
                  fontFamily: FONT.archivo,
                  fontWeight: 800,
                  fontSize: 13.5,
                  background: mode === k ? C.red : "transparent",
                  color: mode === k ? "#fff" : C.muted2,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {mode === "dani" ? (
            <Calendar selDay={selDay} today={today} matchDates={matchDates} onSelect={pickDay} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weeks.map((w) => {
                const cnt = matches.filter((m) => weekOf(m.date) === w.n).length;
                const on = selWeek === w.n;
                return (
                  <button
                    key={w.n}
                    onClick={() => pickWeek(w.n)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      border: on ? `1.5px solid ${C.red}` : "1.5px solid #EEF0F4",
                      cursor: "pointer",
                      background: on ? C.redTintBg : "#fff",
                      borderRadius: 14,
                      padding: "13px 15px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: on ? C.red : C.bg, color: on ? "#fff" : C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.anton, fontSize: 16 }}>
                      {w.n}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15, color: C.ink }}>{w.label}</div>
                      <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>{w.range}</div>
                    </div>
                    <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.faint }}>{cnt} ut.</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* match list */}
      <div style={{ padding: "8px 16px 0" }}>
        {days.length === 0 && (
          <div style={{ textAlign: "center", padding: "46px 20px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 14, color: C.muted }}>
            Nema utakmica za ovaj dan.
          </div>
        )}
        {days.map((d) => (
          <div key={d.date} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 10px" }}>
              <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13.5, color: C.ink, letterSpacing: 0.3, whiteSpace: "nowrap", flexShrink: 0 }}>
                {dayHeading(d.date, today)}
              </div>
              <div style={{ flex: 1, height: 1, background: C.hairline3 }} />
              <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: C.faint }}>{d.items.length} ut.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {d.items.map((m) => (
                <MatchCard key={m.id} m={m} nowMs={nowMs} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function MatchCard({ m, nowMs }: { m: MatchView; nowMs: number }) {
  const done = m.status === "final" && m.res;
  const locked = done || m.status === "live" || nowMs >= m.kickoff;
  const earned = m.earned ?? 0;
  const earnTone = earned >= 3 ? "green" : earned >= 1 ? "gold" : "gray";

  return (
    <Link
      href={`/match/${m.id}`}
      style={{
        display: "block",
        background: C.surface,
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: SHADOW.card,
        border: "1px solid #F1F2F5",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <Tag tone={m.friendly ? "gold" : "gray"}>{matchTag(m)}</Tag>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
            {done ? <Tag tone="green">ZAVRŠENO</Tag> : <><Icon.clock s={13} />{kickoffLabel(m.date, m.kickoff)}</>}
          </span>
          {!locked && (
            <Countdown
              kickoff={m.kickoff}
              prefix="za"
              style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11, color: C.red }}
            />
          )}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <TeamBadge code={m.home} size={40} />
          <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15, color: C.ink }}>{teamName(m.home)}</span>
        </div>
        {done ? (
          <Score a={m.res![0]} b={m.res![1]} />
        ) : (
          <Score a={m.myPick ? m.myPick[0] : null} b={m.myPick ? m.myPick[1] : null} tone={m.myPick ? "ghost" : "open"} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <TeamBadge code={m.away} size={40} />
          <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15, color: C.ink }}>{teamName(m.away)}</span>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed #ECEEF2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {done ? (
          <>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted }}>
              {m.myPick ? `Tvoj tip ${m.myPick[0]}:${m.myPick[1]}` : "Nisi tipovao"}
            </span>
            {m.myPick && <Tag tone={earnTone}>+{earned.toFixed(1)} bodova</Tag>}
          </>
        ) : m.myPick ? (
          <>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.green }}>
              ✓ {locked ? "Tip zaključan" : "Tip predan"}
            </span>
            {!locked && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.gold }}>
                ⚡ Izazovi <Icon.chev s={14} />
              </span>
            )}
          </>
        ) : (
          <>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted }}>
              {locked ? "Bez tipa" : "Još nema tipa"}
            </span>
            {!locked && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.red }}>
                Tipuj <Icon.chev s={14} />
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function Calendar({
  selDay,
  today,
  matchDates,
  onSelect,
}: {
  selDay: string;
  today: string;
  matchDates: string[];
  onSelect: (iso: string) => void;
}) {
  const [month, setMonth] = useState(Number(selDay.split("-")[1]));
  const y = 2026;
  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(y, month, 0).getDate();
  const firstCol = (new Date(y, month - 1, 1).getDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navStyle = (dis: boolean) => ({
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "none",
    cursor: dis ? "default" : "pointer",
    background: dis ? C.bg : "#fff",
    color: dis ? C.faint3 : C.ink,
    boxShadow: dis ? "none" : "inset 0 0 0 1.5px #E7E9EE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => setMonth(6)} disabled={month === 6} style={navStyle(month === 6)}>
          <Icon.back s={18} />
        </button>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15.5, color: C.ink }}>
          {MONTHS_FULL[month - 1]} {y}
        </div>
        <button onClick={() => setMonth(7)} disabled={month === 7} style={navStyle(month === 7)}>
          <Icon.chev s={18} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {WD_SHORT_MON.map((w) => (
          <div key={w} style={{ textAlign: "center", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 10.5, color: C.faint, padding: "2px 0" }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = `${y}-${pad(month)}-${pad(d)}`;
          const has = matchDates.includes(iso);
          const sel = iso === selDay;
          const isToday = iso === today;
          return (
            <button
              key={i}
              disabled={!has}
              onClick={() => has && onSelect(iso)}
              style={{
                border: "none",
                background: "transparent",
                cursor: has ? "pointer" : "default",
                padding: "2px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.archivo,
                  fontWeight: sel ? 800 : 700,
                  fontSize: 14,
                  background: sel ? C.red : "transparent",
                  color: sel ? "#fff" : has ? C.ink : C.faint3,
                  border: isToday && !sel ? `1.5px solid ${C.red}` : "1.5px solid transparent",
                }}
              >
                {d}
              </div>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: has && !sel ? C.gold : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
