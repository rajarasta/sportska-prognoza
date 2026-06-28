"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OverlayHeader from "@/components/OverlayHeader";
import { TeamBadge, teamName, matchTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE } from "@/lib/tokens";
import { dayHeading, kickoffLabel } from "@/lib/data/season";
import { submitPrediction } from "@/app/actions/predictions";
import Countdown from "@/components/Countdown";
import { isKnockoutMatch } from "@/lib/matches";
import type { MatchStage, MatchWinner, Scoreline } from "@/lib/types";

interface MatchLite {
  id: string;
  group: string;
  stage?: MatchStage;
  friendly?: boolean;
  home: string;
  away: string;
  date: string;
  time: string;
  kickoff: number;
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
  const [etH, setEtH] = useState(0);
  const [etA, setEtA] = useState(0);
  const [penWinner, setPenWinner] = useState<MatchWinner>("home");
  const [penH, setPenH] = useState("");
  const [penA, setPenA] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const knockout = isKnockoutMatch(match);
  const entersExtraTime = knockout && h === a;
  const entersPenalties = entersExtraTime && etH === etA;

  const save = () => {
    setError(null);
    const hasPenaltyScore = penH.trim() !== "" || penA.trim() !== "";
    if (entersPenalties && hasPenaltyScore && (penH.trim() === "" || penA.trim() === "")) {
      setError("Upiši oba broja penala ili ostavi prazno.");
      return;
    }
    const penaltyPick =
      entersPenalties && hasPenaltyScore
        ? ([parseInt(penH, 10), parseInt(penA, 10)] as Scoreline)
        : null;
    startTransition(async () => {
      const res = await submitPrediction(
        match.id,
        [h, a],
        knockout
          ? {
              extraTimePick: entersExtraTime ? [etH, etA] : null,
              penaltyWinnerPick: entersPenalties ? penWinner : null,
              penaltyPick,
            }
          : undefined,
      );
      if (res.ok) {
        setToast(`Tip ${h}:${a} predan ✓`);
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
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader
        title="Unesi tip"
        fallback={`/match/${match.id}`}
        right={
          <button
            onClick={save}
            disabled={pending}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 11,
              border: "none",
              background: pending ? C.disabledBtn : C.red,
              color: "#fff",
              fontFamily: FONT.archivo,
              fontWeight: 800,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              cursor: pending ? "default" : "pointer",
              boxShadow: pending ? "none" : "0 6px 14px rgba(228,0,43,.32)",
            }}
          >
            {pending ? "Predajem…" : <><Icon.check s={16} /> Predaj {h}:{a}</>}
          </button>
        }
      />

      <div style={{ padding: "8px 20px 0" }}>
        <div style={{ textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, color: C.muted, marginBottom: 18 }}>
          {matchTag(match)} · {dayHeading(match.date, today)} · {kickoffLabel(match.date, match.kickoff)} po HR vremenu
          <Countdown
            kickoff={match.kickoff}
            style={{ display: "block", marginTop: 4, fontSize: 12, color: C.red }}
          />
        </div>

        <div style={{ background: C.surface, borderRadius: 22, padding: "26px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
          <Stepper code={match.home} val={h} set={setH} />
          <div style={{ fontFamily: FONT.anton, fontSize: 34, color: "#D7DAE0", alignSelf: "center", paddingTop: 70 }}>:</div>
          <Stepper code={match.away} val={a} set={setA} />
        </div>

        {entersExtraTime && (
          <div style={{ marginTop: 12, background: C.surface, borderRadius: 18, padding: "16px", boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>
              Produžetak
            </div>
            <MiniScorePicker
              home={match.home}
              away={match.away}
              h={etH}
              a={etA}
              setH={setEtH}
              setA={setEtA}
            />
          </div>
        )}

        {entersPenalties && (
          <div style={{ marginTop: 12, background: C.surface, borderRadius: 18, padding: "16px", boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>
              Penali
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <WinnerButton
                code={match.home}
                active={penWinner === "home"}
                onClick={() => setPenWinner("home")}
              />
              <WinnerButton
                code={match.away}
                active={penWinner === "away"}
                onClick={() => setPenWinner("away")}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <PenaltyInput value={penH} onChange={setPenH} label={`${match.home} penali`} />
              <span style={{ fontFamily: FONT.anton, fontSize: 18, color: C.faint2 }}>:</span>
              <PenaltyInput value={penA} onChange={setPenA} label={`${match.away} penali`} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, background: "linear-gradient(135deg,#FFF7E0,#FFEFC2)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 26 }}>🎯</div>
          <div style={{ flex: 1, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13, color: C.goldText, lineHeight: 1.4 }}>
            Pun pogodak <b>{h}:{a}</b> nosi <b>3 boda</b> u oba sustava. Staro gleda Gauss + golove, M2 prvo gleda ishod pa blizinu rezultata.
          </div>
        </div>

        <div style={{ marginTop: 12, background: C.surface, borderRadius: 18, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ flex: 1, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>
            Tip je <b>konačan</b> — nakon predaje se ne može mijenjati, a otkrivaju ti se tipovi ekipe (i možeš ih izazvati).
          </div>
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

function MiniScorePicker({
  home,
  away,
  h,
  a,
  setH,
  setA,
}: {
  home: string;
  away: string;
  h: number;
  a: number;
  setH: (n: number) => void;
  setA: (n: number) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
      <MiniStepper code={home} val={h} set={setH} />
      <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.faint2 }}>:</span>
      <MiniStepper code={away} val={a} set={setA} />
    </div>
  );
}

function MiniStepper({ code, val, set }: { code: string; val: number; set: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0 }}>
      <button onClick={() => set(Math.max(0, val - 1))} style={smallStepBtn(false)} aria-label={`${code} minus`}>
        <Icon.minus s={15} />
      </button>
      <div style={{ minWidth: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <TeamBadge code={code} size={30} />
        <span style={{ fontFamily: FONT.anton, fontSize: 30, color: C.ink, lineHeight: 1 }}>{val}</span>
      </div>
      <button onClick={() => set(Math.min(12, val + 1))} style={smallStepBtn(true)} aria-label={`${code} plus`}>
        <Icon.plus s={15} />
      </button>
    </div>
  );
}

function WinnerButton({
  code,
  active,
  onClick,
}: {
  code: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 44,
        borderRadius: 12,
        border: active ? `1.5px solid ${C.red}` : `1.5px solid ${C.hairline3}`,
        background: active ? C.redTintBg : "#fff",
        color: C.ink,
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: 12.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
      }}
    >
      <TeamBadge code={code} size={24} />
      {teamName(code)}
    </button>
  );
}

function PenaltyInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={30}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder="-"
      style={{
        width: 58,
        height: 38,
        borderRadius: 10,
        border: `1.5px solid ${C.hairline3}`,
        textAlign: "center",
        fontFamily: FONT.anton,
        fontSize: 18,
        color: C.ink,
        background: "#fff",
      }}
    />
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

function smallStepBtn(primary: boolean) {
  return {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: primary ? C.red : "#fff",
    color: primary ? "#fff" : C.ink,
    boxShadow: primary ? "0 4px 10px rgba(228,0,43,.25)" : "inset 0 0 0 1.5px #E2E5EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as const;
}
