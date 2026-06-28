import OverlayHeader from "@/components/OverlayHeader";
import { Score } from "@/components/ui";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";

export default function PravilaBodovanje() {
  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader title="Kako se boduje" accent={C.red} fallback="/pravila" />
      <div style={{ background: C.red, color: "#fff", padding: "2px 22px 26px", borderRadius: "0 0 28px 28px" }}>
        <div style={{ fontFamily: FONT.anton, fontSize: 30, lineHeight: 1, marginBottom: 8 }}>SKUPLJANJE BODOVA</div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13.5, color: "rgba(255,255,255,.85)", lineHeight: 1.45 }}>
          App paralelno prikazuje staro Gauss bodovanje i novi M2 sustav. Točan rezultat vrijedi 3 boda u oba.
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, margin: "0 2px 12px" }}>
          Staro bodovanje
        </div>
        <TierCard ic="🎯" title="Točan rezultat" pts="3 boda" tone={C.red} body="Pogodiš oba broja golova — puni pogodak, maksimum bodova." />
        <TierCard ic="📊" title="Blizina (Gaussova krivulja)" pts="0–1 bod" tone={C.red} body="Promašaj nosi između 0 i 1 bod, ovisno koliko si daleko. Najmanji promašaj = vrh krivulje = 1 bod." />
        <TierCard ic="➕" title="Bonus za broj golova" pts="+0,3" tone={C.green} body="Ako pogodiš točan broj golova jedne ekipe (a ne cijeli rezultat), dobiješ +0,3 boda povrh Gaussove." />

        <div style={{ background: C.surface, borderRadius: 18, padding: "18px 16px 12px", boxShadow: SHADOW.card, border: "1px solid #F1F2F5", marginBottom: 18 }}>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
            Gaussova krivulja
          </div>
          <BellCurve />
        </div>

        <div style={{ background: C.surface, borderRadius: 18, padding: "16px 16px 6px", boxShadow: SHADOW.card, border: "1px solid #F1F2F5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink }}>Primjer</span>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>stvarni rezultat</span>
            <Score a={2} b={1} tone="green" />
          </div>
          <ExampleRow pick={[2, 8]} note="Pogodio broj golova domaćih (2) → 0,3 + sitno s krivulje jer je 8 jako daleko." total="≈0,4" tone="#C9A227" />
          <ExampleRow pick={[3, 3]} note="Nije pogodio nijedan broj, ali je blizu → skoro vrh krivulje, bez bonusa." total="≈1,0" tone={C.green} />
        </div>

        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, margin: "20px 2px 12px" }}>
          Novo M2 bodovanje
        </div>
        <TierCard ic="🎯" title="Točan rezultat" pts="3 boda" tone={C.red} body="Ako pogodiš cijeli rezultat, odmah dobivaš 3 boda." />
        <TierCard ic="✅" title="Pogođen ishod" pts="1 + g" tone={C.green} body="Ako je pobjednik ili X točan, dobivaš 1 bod zajamčeno plus do 1 dodatni bod za blizinu rezultata." />
        <TierCard ic="↔️" title="Kriv ishod" pts="0,5×s + 0,4×g" tone="#C9A227" body="Ako je ishod kriv, ostaješ ispod svakog tko je pogodio ishod, ali dobivaš dio za pogođene golove momčadi i blizinu." />

        <div style={{ background: C.surface, borderRadius: 18, padding: "16px", boxShadow: SHADOW.card, border: "1px solid #F1F2F5", marginBottom: 18 }}>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
            M2 formula
          </div>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted3, lineHeight: 1.55 }}>
            g = exp(-d² / 7.22), gdje je d udaljenost između tipa i rezultata. s je broj momčadi kojima si pogodio točan broj golova (0, 1 ili 2). Pravilo prijelaza: pogođen ishod uvijek vrijedi više od promašenog ishoda.
          </div>
        </div>

        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted, margin: "20px 2px 12px" }}>
          Knockout M2
        </div>
        <TierCard ic="⏱️" title="90 minuta" pts="puni M2" tone={C.red} body="Knockout utakmica prvo se boduje po istom M2 pravilu kao grupa, ali samo na rezultatu nakon 90 minuta." />
        <TierCard ic="➕" title="Produžetak" pts="M2 / 3" tone={C.green} body="Produžetak se boduje samo ako je nakon 90 minuta bilo neriješeno i tvoj 90-min tip je bio X. Gledaju se samo golovi u produžetku." />
        <TierCard ic="🥅" title="Penali" pts="+0,5" tone="#C9A227" body="Penali se boduju samo ako je produžetak završio neriješeno i tvoj tip produžetka je bio X. Boduje se samo pogođeni prolaznik; rezultat penala se pamti za kasnije." />
      </div>
    </main>
  );
}

function TierCard({ ic, title, pts, tone, body }: { ic: string; title: string; pts: string; tone: string; body: string }) {
  return (
    <div style={{ background: C.surface, borderRadius: 18, padding: 16, boxShadow: SHADOW.card, border: "1px solid #F1F2F5", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>{ic}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15.5, color: C.ink }}>{title}</div>
            <div style={{ fontFamily: FONT.anton, fontSize: 22, color: tone, whiteSpace: "nowrap" }}>{pts}</div>
          </div>
          <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12.5, color: C.muted3, marginTop: 4, lineHeight: 1.45 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function ExampleRow({ pick, note, total, tone }: { pick: [number, number]; note: string; total: string; tone: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid #F1F2F5" }}>
      <div style={{ width: 70 }}>
        <Score a={pick[0]} b={pick[1]} tone="ghost" />
      </div>
      <div style={{ flex: 1, fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12, color: C.muted3, lineHeight: 1.35 }}>{note}</div>
      <div style={{ fontFamily: FONT.anton, fontSize: 20, color: tone, whiteSpace: "nowrap" }}>{total}</div>
    </div>
  );
}

function bellPath(w: number, base: number, sigma: number, amp: number): string {
  const mu = w / 2;
  let d = `M0 ${base}`;
  for (let x = 0; x <= w; x += 4) {
    const y = base - amp * Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma));
    d += ` L${x} ${y.toFixed(1)}`;
  }
  d += ` L${w} ${base}`;
  return d;
}

function BellCurve() {
  const W = 300, base = 104, sigma = 46, amp = 84;
  const d = bellPath(W, base, sigma, amp);
  return (
    <svg viewBox={`0 0 ${W} 130`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="bell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E4002B" stopOpacity=".28" />
          <stop offset="1" stopColor="#E4002B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={base} x2={W} y2={base} stroke="#E7E9EE" strokeWidth="1.5" />
      <path d={`${d} Z`} fill="url(#bell)" />
      <path d={d} fill="none" stroke="#E4002B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={W / 2} cy={base - amp} r="5" fill="#E4002B" stroke="#fff" strokeWidth="2.5" />
      <line x1={W / 2} y1={base - amp} x2={W / 2} y2={base} stroke="#E4002B" strokeWidth="1.5" strokeDasharray="3 3" opacity=".5" />
      <text x={W / 2} y={base - amp - 10} textAnchor="middle" fontFamily="var(--font-anton)" fontSize="15" fill="#E4002B">1 BOD</text>
      <text x="6" y={base + 18} fontFamily="var(--font-archivo)" fontWeight="700" fontSize="10.5" fill="#9AA1AD">jako daleko</text>
      <text x={W / 2} y={base + 18} textAnchor="middle" fontFamily="var(--font-archivo)" fontWeight="800" fontSize="10.5" fill="#0E1116">točno blizu</text>
      <text x={W - 6} y={base + 18} textAnchor="end" fontFamily="var(--font-archivo)" fontWeight="700" fontSize="10.5" fill="#9AA1AD">jako daleko</text>
    </svg>
  );
}
