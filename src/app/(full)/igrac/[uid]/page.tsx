import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getPlayerProfile, type PlayerMatchRow } from "@/lib/server/queries";
import OverlayHeader from "@/components/OverlayHeader";
import { Avatar, Score, SectionTitle, Tag, TeamBadge, teamName } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";
import { kickoffLabel } from "@/lib/data/season";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid: targetUid } = await params;
  const { uid: viewerUid } = await requireUser();
  const data = await getPlayerProfile(targetUid, viewerUid);
  if (!data) notFound();

  // Group rows by week, preserving chronological order.
  const groups: { week: number; rows: PlayerMatchRow[] }[] = [];
  for (const r of data.rows) {
    let g = groups.find((x) => x.week === r.week);
    if (!g) {
      g = { week: r.week, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }
  groups.sort((a, b) => a.week - b.week);

  const weekLabel = (n: number) => (n === 0 ? "Probni krug" : `Tjedan ${n}`);

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader title={data.you ? "Tvoj profil" : data.name} accent={C.ink} fallback="/bodovi" />

      {/* hero */}
      <div style={{ background: C.ink, color: "#fff", padding: "8px 20px 26px", borderRadius: "0 0 28px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar p={data} size={64} ring="rgba(255,255,255,.25)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 20 }}>{data.name}</span>
              {data.you && <Tag tone="red" style={{ padding: "2px 6px", fontSize: 9.5 }}>TI</Tag>}
            </div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {data.rank}. mjesto na ljestvici
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Stat value={data.totalPoints.toFixed(1)} label="Bodova" />
          <Stat value={`${data.exactCount}`} label="Točnih 🎯" />
          <Stat value={`${data.duelsWon}`} label="Izazova ⚡" />
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {groups.map((g) => (
          <div key={g.week} style={{ marginBottom: 6 }}>
            <SectionTitle>{weekLabel(g.week)}</SectionTitle>
            <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card, marginBottom: 16 }}>
              {g.rows.map((r, i) => (
                <MatchRow key={r.matchId} r={r} first={i === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,.08)", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT.anton, fontSize: 22, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MatchRow({ r, first }: { r: PlayerMatchRow; first: boolean }) {
  const done = r.status === "final" && r.res;
  const earned = r.earned ?? 0;
  const earnTone = earned >= 3 ? "green" : earned >= 1 ? "gold" : "gray";

  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: first ? "none" : "1px solid #F1F2F5" }}>
      {/* teams */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <TeamLine code={r.home} />
        <TeamLine code={r.away} />
      </div>

      {/* result + pick */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        {done ? (
          <Score a={r.res![0]} b={r.res![1]} tone="red" />
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: C.muted }}>
            <Icon.clock s={12} />
            {kickoffLabel(r.date, r.kickoff)}
          </span>
        )}

        {!r.revealed ? (
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: C.faint }}>🔒 tip skriven</span>
        ) : r.pick ? (
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12, color: C.muted }}>
              Tip {r.pick[0]}:{r.pick[1]}
            </span>
            {done ? (
              r.friendly ? (
                <Tag tone="gray">probna</Tag>
              ) : (
                <Tag tone={earnTone}>{r.exact ? "🎯 " : ""}+{earned.toFixed(1)}</Tag>
              )
            ) : (
              <Tag tone="gray">čeka</Tag>
            )}
          </span>
        ) : (
          <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, color: C.faint }}>
            {r.locked ? "bez tipa" : "još nije"}
          </span>
        )}
      </div>
    </div>
  );

  // Deep-link to the match detail; the detail screen re-applies peek-prevention itself.
  return (
    <Link href={`/match/${r.matchId}`} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      {inner}
    </Link>
  );
}

function TeamLine({ code }: { code: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <TeamBadge code={code} size={26} />
      <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {teamName(code)}
      </span>
    </div>
  );
}
