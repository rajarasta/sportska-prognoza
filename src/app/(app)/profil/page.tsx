import Link from "next/link";
import { requireUser } from "@/lib/server/session";
import { getLeaderboard, getMyHistory } from "@/lib/server/queries";
import { Avatar, Score, SectionTitle, Tag, TeamBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import { C, FONT, R, SHADOW, SAFE } from "@/lib/tokens";
import { SEASON } from "@/lib/data/season";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { uid, name, profile } = await requireUser();
  const [standings, history] = await Promise.all([getLeaderboard(uid), getMyHistory(uid)]);

  const rank = standings.findIndex((s) => s.uid === uid) + 1;
  const points = profile?.totalPoints ?? 0;
  const exact = profile?.exactCount ?? 0;
  const won = profile?.duelsWon ?? 0;
  const lost = profile?.duelsLost ?? 0;
  const bestWeek = profile?.bestWeekPoints ?? 0;
  const me = { init: profile?.init ?? "?", color: profile?.color ?? C.ink };

  const badges = [
    { ic: "🎯", label: "Snajper", sub: `${exact} točnih`, on: exact >= 3 },
    { ic: "⚡", label: "Dueler", sub: `${won} dobivenih izazova`, on: won >= 1 },
    { ic: "🔥", label: "Vrući niz", sub: "3 utakmice zaredom", on: false },
    { ic: "🛡️", label: "Bez nule", sub: "svaki krug bodovi", on: false },
  ];

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      {/* hero */}
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
            <div style={{ fontFamily: FONT.anton, fontSize: 30, color: C.gold, lineHeight: 1 }}>#{rank || "–"}</div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11, color: C.muted }}>RANG</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 18 }}>
          <div style={{ fontFamily: FONT.anton, fontSize: 44, color: "#fff", lineHeight: 1 }}>{points.toFixed(1)}</div>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.muted }}>bodova ukupno</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* stat cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <Stat big={String(exact)} label="TOČNIH" tone={C.green} />
          <Stat big={`${won}–${lost}`} label="IZAZOVI W–L" tone={C.red} />
          <Stat big={bestWeek.toFixed(1)} label="NAJBOLJI TJ." tone={C.ink} />
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
            history.map((m, i) => (
              <div key={m.matchId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? "1px solid #F1F2F5" : "none" }}>
                <TeamBadge code={m.home} size={30} />
                <Score a={m.res[0]} b={m.res[1]} />
                <TeamBadge code={m.away} size={30} />
                <div style={{ flex: 1, textAlign: "right", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
                  tip {m.pick[0]}:{m.pick[1]}
                </div>
                <Tag tone={m.earned >= 3 ? "green" : m.earned >= 1 ? "gold" : "gray"}>+{m.earned.toFixed(1)}</Tag>
              </div>
            ))
          )}
        </div>

        <SectionTitle>Pravila & info</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card, marginBottom: 18 }}>
          <RuleRow icon="🎯" label="Kako se boduje" sub="Točan rezultat, Gauss, bonusi" href="/pravila/bodovanje" />
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
