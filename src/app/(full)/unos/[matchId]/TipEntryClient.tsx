"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OverlayHeader from "@/components/OverlayHeader";
import { TeamBadge, teamName, matchTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE } from "@/lib/tokens";
import { dayHeading } from "@/lib/data/season";
import { submitPrediction } from "@/app/actions/predictions";
import type { Scoreline } from "@/lib/types";

interface MatchLite {
  id: string;
  group: string;
  friendly?: boolean;
  home: string;
  away: string;
  date: string;
  time: string;
}

export default function TipEntryClient({
  match,
  initial,
  today,
}: {
  match: MatchLite;
  initial: Scoreline | null;
  today: string;
}) {
  const router = useRouter();
  const [h, setH] = useState(initial ? initial[0] : 1);
  const [a, setA] = useState(initial ? initial[1] : 1);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitPrediction(match.id, [h, a]);
      if (res.ok) {
        setToast(`Tip ${h}:${a} spremljen ✓`);
        setTimeout(() => {
          router.push(`/match/${match.id}`);
          router.refresh();
        }, 850);
      } else {
        setError(res.error ?? "Greška pri spremanju.");
      }
    });
  };

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <OverlayHeader title="Unesi tip" fallback={`/match/${match.id}`} />

      <div style={{ padding: "8px 20px 0", flex: 1 }}>
        <div style={{ textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, color: C.muted, marginBottom: 18 }}>
          {matchTag(match)} · {dayHeading(match.date, today)} · {match.time}
        </div>

        <div style={{ background: C.surface, borderRadius: 22, padding: "26px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
          <Stepper code={match.home} val={h} set={setH} />
          <div style={{ fontFamily: FONT.anton, fontSize: 34, color: "#D7DAE0", alignSelf: "center", paddingTop: 70 }}>:</div>
          <Stepper code={match.away} val={a} set={setA} />
        </div>

        <div style={{ marginTop: 16, background: "linear-gradient(135deg,#FFF7E0,#FFEFC2)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 26 }}>🎯</div>
          <div style={{ flex: 1, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, color: C.goldText, lineHeight: 1.4 }}>
            Pun pogodak <b>{h}:{a}</b> nosi <b>3 boda</b>. Promašaj nosi 0–1 bod po Gaussovoj + 0,3 za točan broj golova ekipe.
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, background: C.redChipBg, color: C.redChipFg, borderRadius: 11, padding: "10px 14px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: `14px 20px ${SAFE.nav}px` }}>
        <button
          onClick={save}
          disabled={pending}
          style={{
            width: "100%",
            height: 54,
            border: "none",
            borderRadius: 16,
            background: pending ? C.disabledBtn : C.red,
            color: "#fff",
            boxShadow: pending ? "none" : "0 8px 20px rgba(228,0,43,.32)",
            fontFamily: FONT.archivo,
            fontWeight: 800,
            fontSize: 16.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Spremam…" : <><Icon.check /> Spremi tip {h}:{a}</>}
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

function Stepper({ code, val, set }: { code: string; val: number; set: (n: number) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <TeamBadge code={code} size={56} />
      <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink, textAlign: "center" }}>{teamName(code)}</div>
      <div style={{ fontFamily: FONT.anton, fontSize: 64, color: C.ink, lineHeight: 0.9 }}>{val}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => set(Math.max(0, val - 1))} style={stepBtn(false)}>
          <Icon.minus />
        </button>
        <button onClick={() => set(Math.min(12, val + 1))} style={stepBtn(true)}>
          <Icon.plus />
        </button>
      </div>
    </div>
  );
}

function stepBtn(primary: boolean) {
  return {
    width: 56,
    height: 56,
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    background: primary ? C.red : "#fff",
    color: primary ? "#fff" : C.ink,
    boxShadow: primary ? "0 6px 16px rgba(228,0,43,.3)" : "inset 0 0 0 1.5px #E2E5EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
