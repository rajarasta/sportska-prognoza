import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getMatchDetail } from "@/lib/server/queries";
import OverlayHeader from "@/components/OverlayHeader";
import { Avatar, Score, SectionTitle, Tag, TeamBadge, teamName } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW } from "@/lib/tokens";
import { dayHeading } from "@/lib/data/season";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uid } = await requireUser();
  const data = await getMatchDetail(id, uid);
  if (!data) notFound();

  const { match: m, myPick, others, revealOthers, breakdown: brk, myDuel } = data;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zagreb" });
  const done = m.status === "final" && m.res;
  const locked = done || m.status === "live" || Date.now() >= m.kickoff;
  const statusLabel = done ? "Završeno" : m.status === "live" ? "Uživo" : "Uskoro";

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 40 }}>
      <OverlayHeader title={`Grupa ${m.group}`} accent={C.ink} />

      {/* hero */}
      <div style={{ background: C.ink, color: "#fff", padding: "4px 20px 28px", borderRadius: "0 0 28px 28px" }}>
        <div style={{ textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          {dayHeading(m.date, today)} · {m.time} · {statusLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-flex" }}><TeamBadge code={m.home} size={62} /></div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, marginTop: 8 }}>{teamName(m.home)}</div>
          </div>
          <div style={{ padding: "0 8px" }}>
            {done ? (
              <Score a={m.res![0]} b={m.res![1]} big tone="red" />
            ) : (
              <div style={{ fontFamily: FONT.anton, fontSize: 26, color: C.muted }}>VS</div>
            )}
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-flex" }}><TeamBadge code={m.away} size={62} /></div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, marginTop: 8 }}>{teamName(m.away)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* tvoj tip */}
        <SectionTitle>Tvoj tip</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, padding: 16, boxShadow: SHADOW.card, marginBottom: 18 }}>
          {myPick ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Score a={myPick.pick[0]} b={myPick.pick[1]} big tone="ink" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>
                  {done ? "Tip predan" : locked ? "Tip zaključan" : "Tip aktivan"}
                </div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12, color: C.muted }}>
                  {done ? "Utakmica završena" : locked ? "Utakmica je počela" : "Možeš mijenjati do zvižduka"}
                </div>
              </div>
              {!locked && (
                <Link
                  href={`/unos/${m.id}`}
                  style={{ border: "1.5px solid #E2E5EA", background: "#fff", borderRadius: 11, padding: "9px 14px", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 13, color: C.ink }}
                >
                  Uredi
                </Link>
              )}
            </div>
          ) : locked ? (
            <div style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13.5, color: C.muted, textAlign: "center", padding: "6px 0" }}>
              Nisi tipovao ovu utakmicu.
            </div>
          ) : (
            <Link
              href={`/unos/${m.id}`}
              style={{
                display: "flex",
                width: "100%",
                height: 54,
                borderRadius: 16,
                background: C.red,
                color: "#fff",
                boxShadow: "0 8px 20px rgba(228,0,43,.32)",
                fontFamily: FONT.archivo,
                fontWeight: 800,
                fontSize: 16.5,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Icon.plus /> Unesi tip
            </Link>
          )}

          {myDuel && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: myDuel.won ? C.green : myDuel.decided ? C.muted : C.ink }}>
                {myDuel.won
                  ? `⚡ Izazov dobiven vs ${myDuel.opponentName}`
                  : myDuel.decided
                    ? `Izazov izgubljen vs ${myDuel.opponentName}`
                    : `⚡ Izazov neriješen vs ${myDuel.opponentName}`}
              </span>
              <span style={{ fontFamily: FONT.anton, fontSize: 22, color: myDuel.won ? C.green : C.ink }}>+{myDuel.points.toFixed(1)}</span>
            </div>
          )}

          {brk && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2" }}>
              {brk.exact ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.green }}>🎯 Točan rezultat!</span>
                  <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.green }}>+{brk.total.toFixed(1)}</span>
                </div>
              ) : (
                <>
                  <BreakLine label="Gaussova krivulja (blizina)" val={brk.gauss} />
                  <BreakLine label="Bonus za broj golova" val={brk.bonus} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F2F5" }}>
                    <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink }}>Ukupno</span>
                    <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.ink }}>+{brk.total.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* tipovi ekipe */}
        <SectionTitle right={!done && others.length && !locked ? <Tag tone="gold">⚡ izazovi</Tag> : null}>Tipovi ekipe</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card }}>
          {!revealOthers ? (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
              Tipni prvo svoj rezultat — tek tada vidiš tipove ekipe (i možeš ih izazvati).
            </div>
          ) : others.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted }}>
              Nitko još nije tipovao.
            </div>
          ) : (
            others.map((o, i) => (
              <div key={o.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid #F1F2F5" : "none" }}>
                <Avatar p={o} size={36} />
                <div style={{ flex: 1, minWidth: 0, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>{o.name}</div>
                <Score a={o.pick[0]} b={o.pick[1]} tone="ghost" />
                {!done && !locked && (
                  <Link
                    href={`/izazov/${m.id}/${o.uid}`}
                    style={{
                      marginLeft: 4,
                      background: C.goldTintBg,
                      color: C.goldText,
                      borderRadius: 11,
                      padding: "9px 12px",
                      fontFamily: FONT.archivo,
                      fontWeight: 800,
                      fontSize: 12.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Icon.bolt s={14} /> Izazovi
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function BreakLine({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted3 }}>{label}</span>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: val > 0 ? C.ink : C.faint2 }}>+{val.toFixed(2)}</span>
    </div>
  );
}
