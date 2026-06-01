"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OverlayHeader from "@/components/OverlayHeader";
import { Avatar, Score, TeamBadge, teamName } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE } from "@/lib/tokens";
import { createChallenge } from "@/app/actions/challenges";
import type { Scoreline } from "@/lib/types";

interface Ctx {
  matchId: string;
  home: string;
  away: string;
  time: string;
  targetUid: string;
  targetName: string;
  targetInit: string;
  targetColor: string;
  targetPick: Scoreline;
}

export default function ChallengeSetupClient({ ctx }: { ctx: Ctx }) {
  const router = useRouter();
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const same = h === ctx.targetPick[0] && a === ctx.targetPick[1];

  const send = () => {
    if (same) return;
    setError(null);
    startTransition(async () => {
      const res = await createChallenge(ctx.matchId, ctx.targetUid, [h, a]);
      if (res.ok) {
        setToast("Izazov poslan ⚡");
        setTimeout(() => {
          router.push("/izazovi");
          router.refresh();
        }, 850);
      } else {
        setError(res.error ?? "Izazov nije uspio.");
      }
    });
  };

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <OverlayHeader title="Pokreni izazov" accent="#1A1206" fallback={`/match/${ctx.matchId}`} />

      <div style={{ padding: "16px 18px 0", flex: 1 }}>
        {/* opponent */}
        <div style={{ background: C.ink, borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13, color: "#fff", marginBottom: 16 }}>
          <Avatar p={{ init: ctx.targetInit, color: ctx.targetColor }} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 15 }}>Izazivaš {ctx.targetName}</div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
              {teamName(ctx.home)} – {teamName(ctx.away)} · {ctx.time}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 10, color: C.muted }}>njegov tip</div>
            <Score a={ctx.targetPick[0]} b={ctx.targetPick[1]} tone="gold" />
          </div>
        </div>

        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, color: C.muted, letterSpacing: 0.5, textAlign: "center", marginBottom: 12 }}>
          TVOJ REZULTAT
        </div>
        <div style={{ background: C.surface, borderRadius: 20, padding: "22px 14px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
          <Mini code={ctx.home} val={h} set={setH} />
          <div style={{ fontFamily: FONT.anton, fontSize: 28, color: "#D7DAE0", alignSelf: "center", paddingBottom: 24 }}>:</div>
          <Mini code={ctx.away} val={a} set={setA} />
        </div>

        {same && (
          <div style={{ marginTop: 12, background: C.redChipBg, borderRadius: 12, padding: "10px 14px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.redChipFg, textAlign: "center" }}>
            Ne možeš igrati isti rezultat kao protivnik.
          </div>
        )}

        <div style={{ marginTop: 16, background: "linear-gradient(135deg,#FFF7E0,#FFE9B0)", borderRadius: 18, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon.bolt s={18} />
            <span style={{ fontFamily: FONT.anton, fontSize: 17, color: "#1A1206" }}>ULOG DUELA</span>
          </div>
          <PayoutRow good label="Pogodiš svoj rezultat" val="2× bodova, bez Gaussa" />
          <PayoutRow label="Promašiš (protivnik pogodi)" val="0 bodova" />
          <PayoutRow label="Oba promaše" val="normalno bodovanje, bez bonusa" />
        </div>

        {error && (
          <div style={{ marginTop: 12, background: C.redChipBg, color: C.redChipFg, borderRadius: 11, padding: "10px 14px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: `14px 18px ${SAFE.nav}px` }}>
        <button
          onClick={send}
          disabled={same || pending}
          style={{
            width: "100%",
            height: 54,
            border: "none",
            borderRadius: 16,
            background: same || pending ? C.disabledBtn : C.gold,
            color: same || pending ? "#fff" : C.ink,
            boxShadow: same || pending ? "none" : "0 8px 20px rgba(242,184,7,.34)",
            fontFamily: FONT.archivo,
            fontWeight: 800,
            fontSize: 16.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: same || pending ? "default" : "pointer",
          }}
        >
          {pending ? "Šaljem…" : <><Icon.bolt s={18} /> Pošalji izazov {h}:{a}</>}
        </button>
      </div>

      {toast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 120, display: "flex", justifyContent: "center", zIndex: 80, pointerEvents: "none" }}>
          <div style={{ background: C.ink, color: "#fff", borderRadius: 14, padding: "12px 18px", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13.5, boxShadow: "0 10px 26px rgba(0,0,0,.3)", animation: "toastIn .25s ease" }}>
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

function Mini({ code, val, set }: { code: string; val: number; set: (n: number) => void }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ display: "inline-flex" }}>
        <TeamBadge code={code} size={42} />
      </div>
      <div style={{ fontFamily: FONT.anton, fontSize: 46, color: C.ink, lineHeight: 1, margin: "8px 0" }}>{val}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => set(Math.max(0, val - 1))} style={miniBtn(false)}>
          <Icon.minus s={16} />
        </button>
        <button onClick={() => set(Math.min(12, val + 1))} style={miniBtn(true)}>
          <Icon.plus s={16} />
        </button>
      </div>
    </div>
  );
}

function miniBtn(primary: boolean) {
  return {
    width: 42,
    height: 42,
    borderRadius: 13,
    border: "none",
    cursor: "pointer",
    background: primary ? C.red : "#fff",
    color: primary ? "#fff" : C.ink,
    boxShadow: primary ? "0 4px 12px rgba(228,0,43,.28)" : "inset 0 0 0 1.5px #E2E5EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}

function PayoutRow({ good, label, val }: { good?: boolean; label: string; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 0" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: good ? C.green : "#C9A227", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11 }}>
        {good ? "✓" : "·"}
      </div>
      <span style={{ flex: 1, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.goldText2 }}>{label}</span>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: "#1A1206", textAlign: "right" }}>{val}</span>
    </div>
  );
}
