"use client";

import { useMemo, useState } from "react";
import { Avatar, SectionTitle, Tag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";
import type { Standing } from "@/lib/server/queries";
import type { WeekDef } from "@/lib/types";

export default function Leaderboard({
  standings,
  weeks,
}: {
  standings: Standing[];
  weeks: WeekDef[];
}) {
  const [view, setView] = useState<string>("total");

  const pointsOf = (s: Standing) => (view === "total" ? s.points : s.weeklyPoints[view] ?? 0);

  const ranked = useMemo(() => {
    const arr = [...standings];
    arr.sort((a, b) => pointsOf(b) - pointsOf(a) || b.exact - a.exact);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings, view]);

  const options = [{ k: "total", label: "Ukupno" }, ...weeks.map((w) => ({ k: String(w.n), label: `T${w.n}` }))];
  const hasPodium = ranked.length >= 3;
  const top3 = ranked.slice(0, 3);
  const rest = hasPodium ? ranked.slice(3) : ranked;

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      {/* header */}
      <div style={{ background: C.surface, padding: `${SAFE.top}px 20px 18px`, borderRadius: "0 0 26px 26px", boxShadow: "0 1px 0 #ECEEF2" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: FONT.anton, fontSize: 32, letterSpacing: 0.5, color: C.ink }}>BODOVI</div>
          <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 11, padding: 4 }}>
            {options.map((o) => (
              <button
                key={o.k}
                onClick={() => setView(o.k)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 11px",
                  borderRadius: 8,
                  fontFamily: FONT.archivo,
                  fontWeight: 800,
                  fontSize: 13,
                  background: view === o.k ? C.ink : "transparent",
                  color: view === o.k ? "#fff" : C.muted2,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {hasPodium ? (
          <Podium top3={top3} pointsOf={pointsOf} />
        ) : (
          <div style={{ textAlign: "center", padding: "22px 8px 6px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13.5, color: C.muted }}>
            Ekipa se popunjava — pozovi još igrača da krene podij.
          </div>
        )}
      </div>

      {/* list */}
      <div style={{ padding: "18px 16px 0" }}>
        <SectionTitle right={<span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>BODOVA · TOČNIH</span>}>
          Poredak
        </SectionTitle>
        <div style={{ background: C.surface, borderRadius: 20, overflow: "hidden", boxShadow: SHADOW.card }}>
          {rest.length === 0 && (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted }}>
              Još nema bodova — kreni s tipovima.
            </div>
          )}
          {rest.map((p, i) => {
            const rank = (hasPodium ? 4 : 1) + i;
            const mv = p.move;
            return (
              <div
                key={p.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: i ? "1px solid #F1F2F5" : "none",
                  background: p.you ? C.redTintBg : "#fff",
                }}
              >
                <div style={{ width: 22, fontFamily: FONT.anton, fontSize: 18, color: C.faint, textAlign: "center" }}>{rank}</div>
                <Avatar p={p} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15.5, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.name}
                    {p.you && <Tag tone="red" style={{ padding: "2px 6px", fontSize: 9.5 }}>TI</Tag>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: mv > 0 ? C.green : mv < 0 ? C.red : C.faint }}>
                    {mv !== 0 && (mv > 0 ? <Icon.arrowUp s={11} /> : <Icon.arrowDn s={11} />)}
                    {mv === 0 ? "–" : Math.abs(mv)}
                    <span style={{ color: C.faint2 }}>mjesta</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONT.anton, fontSize: 21, color: C.ink, lineHeight: 1 }}>{pointsOf(p).toFixed(1)}</div>
                  <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11, color: C.muted }}>{p.exact}× 🎯</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Podium({ top3, pointsOf }: { top3: Standing[]; pointsOf: (s: Standing) => number }) {
  const order = [top3[1], top3[0], top3[2]]; // 2 - 1 - 3
  const meta = [
    { h: 86, ring: "#C7CCD4", medal: "2", size: 56 },
    { h: 112, ring: C.gold, medal: "1", size: 68 },
    { h: 70, ring: "#D08B4F", medal: "3", size: 56 },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, padding: "8px 4px 4px" }}>
      {order.map((p, i) => {
        const m = meta[i];
        const mine = p.you;
        return (
          <div key={p.uid} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar p={p} size={m.size} ring={m.ring} />
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, marginTop: 8, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}>
              {p.name}
              {mine && <span style={{ color: C.red, fontSize: 11 }}>● TI</span>}
            </div>
            <div style={{ fontFamily: FONT.anton, fontSize: 22, color: C.ink, lineHeight: 1 }}>{pointsOf(p).toFixed(1)}</div>
            <div
              style={{
                marginTop: 8,
                width: "100%",
                height: m.h,
                borderRadius: "14px 14px 0 0",
                background: i === 1 ? C.podiumGold : "#EDEFF3",
                border: mine ? `2px solid ${C.red}` : "none",
                borderBottom: "none",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 10,
                fontFamily: FONT.anton,
                fontSize: 30,
                color: i === 1 ? C.goldText : C.faint,
              }}
            >
              {m.medal}
            </div>
          </div>
        );
      })}
    </div>
  );
}
