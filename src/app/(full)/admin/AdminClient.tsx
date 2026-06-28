"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OverlayHeader from "@/components/OverlayHeader";
import { Tag, TeamBadge, teamName, matchTag } from "@/components/ui";
import { C, FONT, SAFE } from "@/lib/tokens";
import { enterResult, clearResult } from "@/app/actions/results";
import MembersManager from "./MembersManager";
import type { AllowlistEntry } from "@/lib/server/queries";
import { isKnockoutMatch } from "@/lib/matches";
import type { MatchStage, MatchStatus, MatchWinner, Scoreline } from "@/lib/types";

export interface AdminMatch {
  id: string;
  no: number;
  group: string;
  stage?: MatchStage;
  friendly?: boolean;
  home: string;
  away: string;
  date: string;
  time: string;
  status: MatchStatus;
  res: Scoreline | null;
  extraTimeRes: Scoreline | null;
  penaltyRes: Scoreline | null;
  winner: MatchWinner | null;
}

export default function AdminClient({
  matches,
  allowlist,
  adminEmails,
}: {
  matches: AdminMatch[];
  allowlist: AllowlistEntry[];
  adminEmails: string[];
}) {
  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader title="Admin" fallback="/profil" />
      <div style={{ padding: "12px 16px 0" }}>
        <MembersManager allowlist={allowlist} adminEmails={adminEmails} />

        <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, margin: "4px 2px 6px" }}>
          Rezultati
        </div>
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Unesi konačan rezultat — bodovi, izazovi i ljestvica se preračunaju automatski.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {matches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </div>
      </div>
    </main>
  );
}

function MatchRow({ m }: { m: AdminMatch }) {
  const router = useRouter();
  const [h, setH] = useState<string>(m.res ? String(m.res[0]) : "");
  const [a, setA] = useState<string>(m.res ? String(m.res[1]) : "");
  const [etH, setEtH] = useState<string>(m.extraTimeRes ? String(m.extraTimeRes[0]) : "");
  const [etA, setEtA] = useState<string>(m.extraTimeRes ? String(m.extraTimeRes[1]) : "");
  const [penH, setPenH] = useState<string>(m.penaltyRes ? String(m.penaltyRes[0]) : "");
  const [penA, setPenA] = useState<string>(m.penaltyRes ? String(m.penaltyRes[1]) : "");
  const [winner, setWinner] = useState<MatchWinner>(m.winner ?? "home");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const final = m.status === "final";
  const knockout = isKnockoutMatch(m);
  const hh = parseInt(h, 10);
  const aa = parseInt(a, 10);
  const hasMainScore = !Number.isNaN(hh) && !Number.isNaN(aa);
  const needsExtraTime = knockout && hasMainScore && hh === aa;
  const eth = parseInt(etH, 10);
  const eta = parseInt(etA, 10);
  const hasExtraScore = !Number.isNaN(eth) && !Number.isNaN(eta);
  const needsPenalties = needsExtraTime && hasExtraScore && eth === eta;

  const save = () => {
    setError(null);
    if (Number.isNaN(hh) || Number.isNaN(aa)) {
      setError("Upiši oba broja.");
      return;
    }
    if (needsExtraTime && !hasExtraScore) {
      setError("Upiši rezultat produžetka.");
      return;
    }
    const ph = parseInt(penH, 10);
    const pa = parseInt(penA, 10);
    if (needsPenalties && (Number.isNaN(ph) || Number.isNaN(pa))) {
      setError("Upiši rezultat penala.");
      return;
    }
    startTransition(async () => {
      const res = await enterResult(
        m.id,
        [hh, aa],
        knockout
          ? {
              extraTimeRes: needsExtraTime ? [eth, eta] : null,
              penaltyRes: needsPenalties ? [ph, pa] : null,
              winner: needsPenalties ? winner : null,
            }
          : undefined,
      );
      if (!res.ok) setError(res.error ?? "Greška.");
      else router.refresh();
    });
  };

  const clear = () => {
    startTransition(async () => {
      const res = await clearResult(m.id);
      if (!res.ok) setError(res.error ?? "Greška.");
      else {
        setH("");
        setA("");
        setEtH("");
        setEtA("");
        setPenH("");
        setPenA("");
        setWinner("home");
        router.refresh();
      }
    });
  };

  const inp = {
    width: 42,
    height: 38,
    borderRadius: 9,
    border: `1.5px solid ${C.hairline3}`,
    textAlign: "center" as const,
    fontFamily: FONT.anton,
    fontSize: 18,
    color: C.ink,
    background: "#fff",
  };

  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: "10px 12px", border: "1px solid #F1F2F5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11, color: C.faint }}>#{m.no}</span>
        <Tag tone={m.friendly ? "gold" : "gray"}>{matchTag(m)}</Tag>
        <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: C.muted }}>{m.date} · {m.time}</span>
        {final && <Tag tone="green">FINAL</Tag>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <TeamBadge code={m.home} size={26} />
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teamName(m.home)}</span>
        </div>
        <input type="number" min={0} max={30} value={h} onChange={(e) => setH(e.target.value)} style={inp} aria-label="domaći" />
        <span style={{ fontFamily: FONT.anton, fontSize: 16, color: C.faint2 }}>:</span>
        <input type="number" min={0} max={30} value={a} onChange={(e) => setA(e.target.value)} style={inp} aria-label="gosti" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", minWidth: 0 }}>
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teamName(m.away)}</span>
          <TeamBadge code={m.away} size={26} />
        </div>
      </div>
      {needsExtraTime && (
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px dashed #ECEEF2", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 72, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11.5, color: C.muted }}>Produžetak</span>
          <input type="number" min={0} max={30} value={etH} onChange={(e) => setEtH(e.target.value)} style={inp} aria-label="produžetak domaći" />
          <span style={{ fontFamily: FONT.anton, fontSize: 16, color: C.faint2 }}>:</span>
          <input type="number" min={0} max={30} value={etA} onChange={(e) => setEtA(e.target.value)} style={inp} aria-label="produžetak gosti" />
          {!needsPenalties && hasExtraScore && (
            <WinnerHint code={eth > eta ? m.home : m.away} />
          )}
        </div>
      )}
      {needsPenalties && (
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px dashed #ECEEF2", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 72, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11.5, color: C.muted }}>Penali</span>
            <input type="number" min={0} max={30} value={penH} onChange={(e) => setPenH(e.target.value)} style={inp} aria-label="penali domaći" />
            <span style={{ fontFamily: FONT.anton, fontSize: 16, color: C.faint2 }}>:</span>
            <input type="number" min={0} max={30} value={penA} onChange={(e) => setPenA(e.target.value)} style={inp} aria-label="penali gosti" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <WinnerChoice code={m.home} active={winner === "home"} onClick={() => setWinner("home")} />
            <WinnerChoice code={m.away} active={winner === "away"} onClick={() => setWinner("away")} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <button
          onClick={save}
          disabled={pending}
          style={{ flex: 1, height: 36, borderRadius: 9, border: "none", background: pending ? C.disabledBtn : C.red, color: "#fff", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, cursor: pending ? "default" : "pointer" }}
        >
          {pending ? "…" : final ? "Promijeni rezultat" : "Spremi rezultat"}
        </button>
        {final && (
          <button
            onClick={clear}
            disabled={pending}
            style={{ height: 36, padding: "0 12px", borderRadius: 9, border: `1.5px solid ${C.hairline3}`, background: "#fff", color: C.muted3, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Poništi
          </button>
        )}
      </div>
      {error && <div style={{ marginTop: 6, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.redChipFg }}>{error}</div>}
    </div>
  );
}

function WinnerHint({ code }: { code: string }) {
  return (
    <span style={{ marginLeft: "auto", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11.5, color: C.green }}>
      prolazi {teamName(code)}
    </span>
  );
}

function WinnerChoice({
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
        border: active ? `1.5px solid ${C.red}` : `1.5px solid ${C.hairline3}`,
        background: active ? C.redTintBg : "#fff",
        color: C.ink,
        borderRadius: 9,
        minHeight: 34,
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {teamName(code)}
    </button>
  );
}
