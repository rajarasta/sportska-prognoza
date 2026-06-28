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
  myPick: Scoreline;
  targetUid: string;
  targetName: string;
  targetInit: string;
  targetColor: string;
  targetPick: Scoreline;
}

export default function ChallengeSetupClient({ ctx }: { ctx: Ctx }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The duel is played with my already-submitted tip — identical tips can't duel.
  const same = ctx.myPick[0] === ctx.targetPick[0] && ctx.myPick[1] === ctx.targetPick[1];

  const send = () => {
    if (same) return;
    setError(null);
    startTransition(async () => {
      const res = await createChallenge(ctx.matchId, ctx.targetUid);
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
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader
        title="Pokreni izazov"
        accent="#1A1206"
        fallback={`/match/${ctx.matchId}`}
        right={
          <button
            onClick={send}
            disabled={same || pending}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 11,
              border: "none",
              background: same || pending ? C.disabledBtn : C.gold,
              color: same || pending ? "#fff" : C.ink,
              fontFamily: FONT.archivo,
              fontWeight: 800,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              cursor: same || pending ? "default" : "pointer",
            }}
          >
            {pending ? "Šaljem…" : <><Icon.bolt s={16} /> Pošalji {ctx.myPick[0]}:{ctx.myPick[1]}</>}
          </button>
        }
      />

      <div style={{ padding: "16px 18px 0" }}>
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

        {/* my tip — fixed: the duel is played with the tip I already submitted */}
        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, color: C.muted, letterSpacing: 0.5, textAlign: "center", marginBottom: 12 }}>
          TVOJ PREDANI TIP
        </div>
        <div style={{ background: C.surface, borderRadius: 20, padding: "22px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex" }}><TeamBadge code={ctx.home} size={42} /></div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.ink, marginTop: 6 }}>{teamName(ctx.home)}</div>
          </div>
          <Score a={ctx.myPick[0]} b={ctx.myPick[1]} big tone="ink" />
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex" }}><TeamBadge code={ctx.away} size={42} /></div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 12.5, color: C.ink, marginTop: 6 }}>{teamName(ctx.away)}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
          Izazov se igra tipom koji si već predao — tip se ne može mijenjati.
        </div>

        {same && (
          <div style={{ marginTop: 12, background: C.redChipBg, borderRadius: 12, padding: "10px 14px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.redChipFg, textAlign: "center" }}>
            Imate isti tip — takav izazov nije moguć.
          </div>
        )}

        <div style={{ marginTop: 16, background: "linear-gradient(135deg,#FFF7E0,#FFE9B0)", borderRadius: 18, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon.bolt s={18} />
            <span style={{ fontFamily: FONT.anton, fontSize: 17, color: "#1A1206" }}>ULOG DUELA</span>
          </div>
          <PayoutRow good label="Pogodiš svoj rezultat" val="2× točan rezultat" />
          <PayoutRow label="Promašiš (protivnik pogodi)" val="0 bodova" />
          <PayoutRow label="Oba promaše" val="staro/M2 bez duplog bonusa" />
        </div>

        {error && (
          <div style={{ marginTop: 12, background: C.redChipBg, color: C.redChipFg, borderRadius: 11, padding: "10px 14px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}
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
