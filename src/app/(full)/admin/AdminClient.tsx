"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OverlayHeader from "@/components/OverlayHeader";
import { Tag, TeamBadge, teamName, matchTag } from "@/components/ui";
import { C, FONT } from "@/lib/tokens";
import { enterResult, clearResult } from "@/app/actions/results";
import MembersManager from "./MembersManager";
import type { AllowlistEntry } from "@/lib/server/queries";
import type { MatchStatus, Scoreline } from "@/lib/types";

export interface AdminMatch {
  id: string;
  no: number;
  group: string;
  friendly?: boolean;
  home: string;
  away: string;
  date: string;
  time: string;
  status: MatchStatus;
  res: Scoreline | null;
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
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 40 }}>
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const final = m.status === "final";

  const save = () => {
    setError(null);
    const hh = parseInt(h, 10);
    const aa = parseInt(a, 10);
    if (Number.isNaN(hh) || Number.isNaN(aa)) {
      setError("Upiši oba broja.");
      return;
    }
    startTransition(async () => {
      const res = await enterResult(m.id, [hh, aa]);
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
