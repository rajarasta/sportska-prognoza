"use client";

import Link from "next/link";
import { Avatar, Score, SectionTitle, Tag, TeamBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import { C, FONT, R, SHADOW, SAFE } from "@/lib/tokens";
import { SEASON } from "@/lib/data/season";
import { useScoringMode } from "@/components/ScoringModeProvider";
import type { HistoryRow, Standing } from "@/lib/server/queries";
import type { MatchWinner, Scoreline, UserDoc } from "@/lib/types";

function winnerName(winner: MatchWinner | null | undefined, home: string, away: string) {
  if (winner === "home") return home;
  if (winner === "away") return away;
  return null;
}

function scoreText(score: Scoreline | null | undefined) {
  return score ? `${score[0]}:${score[1]}` : null;
}

function knockoutText({
  extraTime,
  penalty,
  winner,
  home,
  away,
}: {
  extraTime?: Scoreline | null;
  penalty?: Scoreline | null;
  winner?: MatchWinner | null;
  home: string;
  away: string;
}) {
  const parts: string[] = [];
  const et = scoreText(extraTime);
  const pen = scoreText(penalty);
  const win = winnerName(winner, home, away);
  if (et) parts.push(`ET ${et}`);
  if (pen) parts.push(`PEN ${pen}`);
  if (win) parts.push(`prolazi ${win}`);
  return parts.join(" · ");
}

export default function ProfilClient({
  name,
  profile,
  standing,
  oldRank,
  history,
}: {
  name: string;
  profile: UserDoc | null;
  standing: Standing | null;
  oldRank: number;
  history: HistoryRow[];
}) {
  const { mode: scoringMode } = useScoringMode();
  const points = scoringMode === "old" ? standing?.points ?? profile?.totalPoints ?? 0 : standing?.m2Points ?? profile?.m2TotalPoints ?? 0;
  const exact = profile?.exactCount ?? 0;
  const won = profile?.duelsWon ?? 0;
  const lost = profile?.duelsLost ?? 0;
  const weekly = scoringMode === "old" ? standing?.weeklyPoints ?? profile?.weeklyPoints ?? {} : standing?.m2WeeklyPoints ?? profile?.m2WeeklyPoints ?? {};
  const bestWeek = Math.max(0, ...Object.values(weekly));
  const me = { init: profile?.init ?? "?", color: profile?.color ?? C.ink };
  const currentRank = scoringMode === "old" ? oldRank : standing?.m2Rank ?? 0;

  const badges = [
    { ic: "🎯", label: "Snajper", sub: `${exact} točnih`, on: exact >= 3 },
    { ic: "⚡", label: "Dueler", sub: `${won} dobivenih izazova`, on: won >= 1 },
    { ic: "🔥", label: "Vrući niz", sub: "3 utakmice zaredom", on: false },
    { ic: "🛡️", label: "Bez nule", sub: "svaki krug bodovi", on: false },
  ];

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <div style={{ background: C.inkGrad, padding: `${SAFE.top}px 20px 26px`, borderRadius: "0 0 28px 28px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar p={me} size={68} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.anton, fontSize: 28, lineHeight: 1 }}>{name}</div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, color: C.muted, marginTop: 3 }}>
              Član lige · {SEASON}
              {profile?.isAdmin ? " · ADMIN" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: FONT.anton, fontSize: 30, color: C.gold, lineHeight: 1 }}>#{currentRank || "–"}</div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11, color: C.muted }}>RANG</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 18 }}>
          <div style={{ fontFamily: FONT.anton, fontSize: 44, color: "#fff", lineHeight: 1 }}>{points.toFixed(2)}</div>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.muted }}>{scoringMode === "old" ? "bodova ukupno" : "M2 bodova ukupno"}</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <Stat big={String(exact)} label="TOČNIH" tone={C.green} />
          <Stat big={`${won}-${lost}`} label="IZAZOVI W-L" tone={C.red} />
          <Stat big={bestWeek.toFixed(2)} label="NAJBOLJI TJ." tone={C.ink} />
        </div>

        <SectionTitle>Značke</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {badges.map((b, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                borderRadius: 16,
                padding: "13px 14px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                opacity: b.on ? 1 : 0.45,
                boxShadow: SHADOW.card,
                border: b.on ? "1.5px solid #FFE89A" : "1.5px solid #EEF0F4",
              }}
            >
              <div style={{ fontSize: 24, filter: b.on ? "none" : "grayscale(1)" }}>{b.ic}</div>
              <div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13.5, color: C.ink }}>{b.label}</div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 11, color: C.muted }}>{b.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Zadnji tipovi</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card, marginBottom: 20 }}>
          {history.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted }}>
              Još nema odigranih utakmica.
            </div>
          ) : (
            history.map((m, i) => {
              const earned = scoringMode === "old" ? m.earned : m.m2Earned;
              return (
                <div key={m.matchId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid #F1F2F5" : "none" }}>
                  <TeamBadge code={m.home} size={30} />
                  <Score a={m.res[0]} b={m.res[1]} />
                  <TeamBadge code={m.away} size={30} />
                  <div style={{ flex: 1, textAlign: "right", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
                    tip {m.pick[0]}:{m.pick[1]}
                    <TinyMeta text={knockoutText({ extraTime: m.extraTimePick, penalty: m.penaltyPick, winner: m.penaltyWinnerPick, home: m.home, away: m.away })} />
                  </div>
                  <Tag tone={earned >= 3 ? "green" : earned >= 1 ? "gold" : "gray"}>+{earned.toFixed(2)}</Tag>
                </div>
              );
            })
          )}
        </div>

        <SectionTitle>Pravila & info</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card, marginBottom: 18 }}>
          <RuleRow icon="🎯" label="Kako se boduje" sub="Staro bodovanje i novi M2" href="/pravila/bodovanje" />
          <RuleRow icon="⚡" label="Kako rade izazovi" sub="Duel za duple bodove" href="/pravila/izazovi" last />
        </div>

        {profile?.isAdmin && (
          <Link
            href="/admin"
            style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 12, borderRadius: R.chip, background: C.surface, boxShadow: SHADOW.card, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink }}
          >
            ⚙️ Admin · unos rezultata
          </Link>
        )}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

function Stat({ big, label, tone }: { big: string; label: string; tone: string }) {
  return (
    <div style={{ flex: 1, background: C.surface, borderRadius: 16, padding: "14px 12px", textAlign: "center", boxShadow: SHADOW.card }}>
      <div style={{ fontFamily: FONT.anton, fontSize: 26, color: tone, lineHeight: 1 }}>{big}</div>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11, color: C.muted, marginTop: 4, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function TinyMeta({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 2, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 10.5, color: C.faint, lineHeight: 1.2 }}>
      {text}
    </div>
  );
}

function RuleRow({ icon, label, sub, href, last }: { icon: string; label: string; sub: string; href: string; last?: boolean }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderTop: last ? "1px solid #F1F2F5" : "none", color: "inherit" }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15, color: C.ink }}>{label}</div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12, color: C.muted }}>{sub}</div>
      </div>
      <span style={{ color: C.faint2 }}><Icon.chev /></span>
    </Link>
  );
}
