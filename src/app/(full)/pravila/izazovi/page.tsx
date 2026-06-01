import OverlayHeader from "@/components/OverlayHeader";
import { Score, Tag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";

const STEPS = [
  { n: 1, t: "Imaš 3 izazova svaki tjedan", b: "Token se troši kad pošalješ izazov." },
  { n: 2, t: "Izazivaš tuđi predani tip", b: "Samo na utakmice koje još nisu odigrane." },
  { n: 3, t: "Igraš svojim rezultatom", b: "Pogodiš točan rezultat → 2× bodova, bez dodataka s Gaussove." },
  { n: 4, t: "Promašiš → 0 bodova", b: "Ako protivnik pogodi, on nosi duplo, ti ništa." },
  { n: 5, t: "Oba promaše → normalno", b: "Obojica idete na standardno bodovanje (Gauss + 0,3), bez bonusa." },
];

export default function PravilaIzazovi() {
  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader title="Kako rade izazovi" accent="#1A1206" fallback="/pravila" />
      <div style={{ background: C.challengeHero, color: "#fff", padding: "2px 22px 26px", borderRadius: "0 0 28px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -10, opacity: 0.12, color: C.gold }}>
          <Icon.bolt s={180} />
        </div>
        <div style={{ fontFamily: FONT.anton, fontSize: 30, lineHeight: 1, marginBottom: 8, position: "relative" }}>DUEL ZA DUPLE BODOVE</div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13.5, color: "#E9D9A8", lineHeight: 1.45, position: "relative" }}>
          Visok rizik, visoka nagrada. Pogodiš svoj rezultat — duplo. Promašiš — ništa.
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ background: C.surface, borderRadius: 18, padding: "4px 16px", boxShadow: SHADOW.card, border: "1px solid #F1F2F5", marginBottom: 18 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 13, padding: "13px 0", borderTop: s.n > 1 ? "1px solid #F1F2F5" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: C.goldTintBg, color: C.goldText, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FONT.anton, fontSize: 15 }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>{s.t}</div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12.5, color: C.muted3, marginTop: 2, lineHeight: 1.4 }}>{s.b}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, margin: "4px 2px 12px" }}>
          Primjer · igrač A tipa 3:2, igrač B izaziva s 1:1
        </div>
        <Scenario outcome={[1, 1]} win="Igrač B" winPick="1:1" lose="Igrač A" losePick="3:2" />
        <Scenario outcome={[3, 2]} win="Igrač A" winPick="3:2" lose="Igrač B" losePick="1:1" />
        <div style={{ background: C.goldTintBg2, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.goldText2, lineHeight: 1.4 }}>
            Padne li nešto treće (npr. 2:0) i oba promaše → svaki dobiva normalne bodove po Gaussovoj, bez 2× bonusa.
          </span>
        </div>
      </div>
    </main>
  );
}

function Scenario({
  outcome,
  win,
  winPick,
  lose,
  losePick,
}: {
  outcome: [number, number];
  win: string;
  winPick: string;
  lose: string;
  losePick: string;
}) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: "14px 16px", boxShadow: SHADOW.card, border: "1px solid #F1F2F5", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>Padne</span>
        <Score a={outcome[0]} b={outcome[1]} tone="ink" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tag tone="green">{win} {winPick}</Tag>
        <span style={{ fontFamily: FONT.anton, fontSize: 16, color: C.green }}>2× bodova</span>
        <span style={{ marginLeft: "auto", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>{lose} {losePick}</span>
        <span style={{ fontFamily: FONT.anton, fontSize: 16, color: C.faint2 }}>0</span>
      </div>
    </div>
  );
}
