import Link from "next/link";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default function PravilaHub() {
  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <div style={{ background: C.surface, padding: `${SAFE.top}px 20px 18px`, borderRadius: "0 0 26px 26px", boxShadow: "0 1px 0 #ECEEF2" }}>
        <div style={{ fontFamily: FONT.anton, fontSize: 32, letterSpacing: 0.5, color: C.ink }}>PRAVILA</div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, marginTop: 4 }}>
          Sve što trebaš znati o bodovanju i duelima.
        </div>
      </div>

      <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        <RuleCard
          href="/pravila/bodovanje"
          accent={C.red}
          emoji="🎯"
          title="KAKO SE BODUJE"
          sub="Točan rezultat, Gaussova krivulja i bonus za broj golova."
          watermark={<Icon.trophy s={150} />}
          watermarkColor="#fff"
        />
        <RuleCard
          href="/pravila/izazovi"
          accent={C.challengeHero}
          emoji="⚡"
          title="KAKO RADE IZAZOVI"
          sub="Duel za duple bodove — visok rizik, visoka nagrada."
          watermark={<Icon.bolt s={150} />}
          watermarkColor={C.gold}
        />
      </div>
    </main>
  );
}

function RuleCard({
  href,
  accent,
  emoji,
  title,
  sub,
  watermark,
  watermarkColor,
}: {
  href: string;
  accent: string;
  emoji: string;
  title: string;
  sub: string;
  watermark: React.ReactNode;
  watermarkColor: string;
}) {
  return (
    <Link
      href={href}
      style={{
        borderRadius: 22,
        padding: 20,
        color: "#fff",
        background: accent,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 6px 18px rgba(14,17,22,.12)",
        display: "block",
      }}
    >
      <div style={{ position: "absolute", right: -20, top: -16, opacity: 0.14, color: watermarkColor }}>{watermark}</div>
      <div style={{ fontSize: 30, marginBottom: 10, position: "relative" }}>{emoji}</div>
      <div style={{ fontFamily: FONT.anton, fontSize: 24, lineHeight: 1, position: "relative" }}>{title}</div>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,.82)", marginTop: 8, lineHeight: 1.4, position: "relative" }}>
        {sub}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, position: "relative" }}>
        Otvori <Icon.chev s={15} />
      </div>
    </Link>
  );
}
