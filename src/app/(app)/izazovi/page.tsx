import Link from "next/link";
import { requireUser } from "@/lib/server/session";
import { getIzazoviData, type DuelView, type ChallengeTarget } from "@/lib/server/izazovi";
import { Avatar, Score, SectionTitle, Tag, TeamBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE, SHADOW } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function IzazoviPage() {
  const { uid } = await requireUser();
  const { tokensRemaining, tokensPerWeek, duels, targets } = await getIzazoviData(uid);
  const canChallenge = tokensRemaining > 0;

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      {/* HERO */}
      <div style={{ background: C.challengeHero3, color: "#fff", padding: `${SAFE.top}px 20px 26px`, borderRadius: "0 0 30px 30px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: 10, opacity: 0.1, color: C.gold }}>
          <Icon.bolt s={220} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.gold, color: "#1A1206", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.bolt s={20} />
          </div>
          <div style={{ fontFamily: FONT.anton, fontSize: 34, letterSpacing: 0.5 }}>IZAZOVI</div>
        </div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 14, color: "#E9D9A8", marginTop: 8, lineHeight: 1.45, position: "relative", maxWidth: 280 }}>
          Izazovi tuđi tip prije zvižduka. Pogodiš svoj rezultat — <b style={{ color: C.gold }}>dupli bodovi</b>. Promašiš — ništa.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, position: "relative" }}>
          <div style={{ display: "flex", gap: 7 }}>
            {Array.from({ length: tokensPerWeek }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: i < tokensRemaining ? C.gold : "rgba(255,255,255,.08)",
                  color: i < tokensRemaining ? "#1A1206" : "rgba(255,255,255,.3)",
                  border: i < tokensRemaining ? "none" : "1.5px dashed rgba(255,255,255,.2)",
                }}
              >
                <Icon.bolt s={20} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.anton, fontSize: 17, color: "#fff", lineHeight: 1 }}>{tokensRemaining} OD {tokensPerWeek}</div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: "#9C8A5E" }}>izazova preostalo ovaj tjedan</div>
          </div>
          <Link href="/pravila/izazovi" style={{ border: "1.5px solid rgba(242,184,7,.4)", color: C.gold, borderRadius: 11, padding: "8px 12px", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12 }}>
            Pravila
          </Link>
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        {/* aktivni dueli */}
        <SectionTitle right={duels.length ? <Tag tone="gold">{duels.length} aktivna</Tag> : null}>Tvoji dueli</SectionTitle>
        {duels.length === 0 ? (
          <div style={{ background: C.surface, borderRadius: 16, padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, boxShadow: SHADOW.card, marginBottom: 22 }}>
            Nemaš aktivnih duela. Pokreni izazov ispod.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
            {duels.map((d) => (
              <DuelCard key={d.id} d={d} />
            ))}
          </div>
        )}

        {/* pokreni izazov */}
        <SectionTitle>Pokreni izazov</SectionTitle>
        {targets.length === 0 ? (
          <div style={{ background: C.surface, borderRadius: 16, padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, boxShadow: SHADOW.card, lineHeight: 1.5 }}>
            Nema dostupnih izazova. Tipni utakmicu pa ćeš vidjeti tipove ekipe koje možeš izazvati.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {targets.map((t) => (
              <TargetRow key={`${t.matchId}_${t.targetUid}`} t={t} enabled={canChallenge} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function DuelCard({ d }: { d: DuelView }) {
  return (
    <div style={{ background: C.surface, borderRadius: 20, overflow: "hidden", boxShadow: SHADOW.raised, border: "1px solid #F1F2F5" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "#FFFBF0", borderBottom: "1px solid #F6EFD8" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.goldText }}>
          <TeamBadge code={d.home} size={18} /> {d.home}–{d.away} · {d.time}
        </span>
        <Tag tone="gold">⚡ 2× = {d.stake} bod.</Tag>
      </div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <DuelSide side={d.me} mine />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.ink, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(14,17,22,.2)" }}>
            <Icon.swords s={20} />
          </div>
        </div>
        <DuelSide side={d.opp} />
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px dashed #ECEEF2", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted, textAlign: "center" }}>
        {d.iChallenged ? "Ti si pokrenuo izazov" : `${d.opp.name} te izazvao`} · pobjednik nosi <b style={{ color: C.goldText }}>{d.stake}</b>, gubitnik <b>0</b>
      </div>
    </div>
  );
}

function DuelSide({ side, mine }: { side: DuelView["me"]; mine?: boolean }) {
  return (
    <div style={{ flex: 1, padding: "14px 12px", textAlign: "center", background: mine ? C.redTintBg : "#fff" }}>
      <div style={{ display: "inline-flex" }}>
        <Avatar p={side} size={40} />
      </div>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13.5, color: C.ink, marginTop: 7, marginBottom: 9 }}>{side.name}</div>
      <Score a={side.pick[0]} b={side.pick[1]} tone={mine ? "red" : "ink"} />
    </div>
  );
}

function TargetRow({ t, enabled }: { t: ChallengeTarget; enabled: boolean }) {
  const inner = (
    <>
      <Avatar p={{ init: t.targetInit, color: t.targetColor }} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>{t.targetName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <TeamBadge code={t.home} size={18} />
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>{t.home}–{t.away}</span>
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.faint2 }}>· tip {t.targetPick[0]}:{t.targetPick[1]}</span>
        </div>
      </div>
      <span
        style={{
          background: enabled ? C.gold : "#EEF0F4",
          color: enabled ? "#1A1206" : C.faint,
          borderRadius: 11,
          padding: "10px 13px",
          fontFamily: FONT.archivo,
          fontWeight: 800,
          fontSize: 12.5,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Icon.bolt s={14} /> Izazovi
      </span>
    </>
  );

  const wrap = {
    background: C.surface,
    borderRadius: 16,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: SHADOW.card,
    border: "1px solid #F1F2F5",
    opacity: enabled ? 1 : 0.6,
  } as const;

  return enabled ? (
    <Link href={`/izazov/${t.matchId}/${t.targetUid}`} style={{ ...wrap, color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    <div style={wrap}>{inner}</div>
  );
}
