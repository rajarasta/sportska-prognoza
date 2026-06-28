"use client";

import { useMemo } from "react";
import Link from "next/link";
import OverlayHeader from "@/components/OverlayHeader";
import { Avatar, Score, SectionTitle, Tag, TeamBadge, teamName, matchTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { C, FONT, SHADOW, SAFE } from "@/lib/tokens";
import { dayHeading, kickoffLabel } from "@/lib/data/season";
import Countdown from "@/components/Countdown";
import { useScoringMode } from "@/components/ScoringModeProvider";
import type { MatchDetailData, OtherPick } from "@/lib/server/queries";
import type { M2PredictionScoreBreakdown, M2ScoreBreakdown } from "@/lib/scoring";
import type { MatchWinner, Scoreline } from "@/lib/types";

function m2BranchLabel(branch: NonNullable<MatchDetailData["m2Breakdown"]>["branch"]) {
  if (branch === "exact") return "Točan rezultat";
  if (branch === "outcome") return "Točan ishod";
  return "Kriv ishod";
}

function pointsOfOther(o: OtherPick, mode: "old" | "m2") {
  return mode === "old" ? o.points : o.m2Points;
}

function winnerName(winner: MatchWinner | null | undefined, home: string, away: string) {
  if (winner === "home") return teamName(home);
  if (winner === "away") return teamName(away);
  return null;
}

function scoreText(score: Scoreline | null | undefined) {
  return score ? `${score[0]}:${score[1]}` : null;
}

function knockoutParts({
  extraTime,
  penalty,
  winner,
  home,
  away,
}: {
  extraTime?: Scoreline | null;
  penalty?: Scoreline | null;
  winner?: MatchWinner | null;
  home: string;
  away: string;
}) {
  const parts: string[] = [];
  const et = scoreText(extraTime);
  const pen = scoreText(penalty);
  const win = winnerName(winner, home, away);
  if (et) parts.push(`ET ${et}`);
  if (pen) parts.push(`PEN ${pen}`);
  if (win) parts.push(`prolazi ${win}`);
  return parts.join(" · ");
}

export default function MatchDetailClient({
  data,
  today,
}: {
  data: MatchDetailData;
  today: string;
}) {
  const { mode: scoringMode } = useScoringMode();
  const { match: m, myPick, revealOthers, breakdown: oldBreakdown, m2Breakdown, myDuel } = data;
  const others = useMemo(
    () =>
      [...data.others].sort(
        (a, b) =>
          (pointsOfOther(b, scoringMode) ?? 0) - (pointsOfOther(a, scoringMode) ?? 0) ||
          a.name.localeCompare(b.name),
      ),
    [data.others, scoringMode],
  );
  const done = m.status === "final" && m.res;
  const locked = done || m.status === "live" || Date.now() >= m.kickoff;
  const statusLabel = done ? "Završeno" : m.status === "live" ? "Uživo" : "Uskoro";
  const duelPoints = myDuel ? (scoringMode === "old" ? myDuel.points : myDuel.m2Points) : 0;
  const duelSecondary = myDuel ? (scoringMode === "old" ? myDuel.m2Points : myDuel.points) : null;

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, paddingBottom: SAFE.nav }}>
      <OverlayHeader title={matchTag(m)} accent={C.ink} />

      <div style={{ background: C.ink, color: "#fff", padding: "4px 20px 28px", borderRadius: "0 0 28px 28px" }}>
        <div style={{ textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          {dayHeading(m.date, today)} · {kickoffLabel(m.date, m.kickoff)} po HR vremenu · {statusLabel}
          {!locked && (
            <div style={{ marginTop: 8 }}>
              <Countdown
                kickoff={m.kickoff}
                style={{ display: "inline-block", background: "rgba(255,255,255,.14)", borderRadius: 9, padding: "4px 11px", color: "#fff", fontSize: 12 }}
              />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ display: "inline-flex" }}><TeamBadge code={m.home} size={62} /></div>
            <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, marginTop: 8 }}>{teamName(m.home)}</div>
          </div>
          <div style={{ padding: "0 8px" }}>
            {done ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Score a={m.res![0]} b={m.res![1]} big tone="red" />
                <KnockoutMeta
                  text={knockoutParts({
                    extraTime: m.extraTimeRes ?? null,
                    penalty: m.penaltyRes ?? null,
                    winner: m.winner ?? null,
                    home: m.home,
                    away: m.away,
                  })}
                  light
                />
              </div>
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
        <SectionTitle>Tvoj tip</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, padding: 16, boxShadow: SHADOW.card, marginBottom: 18 }}>
          {myPick ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Score a={myPick.pick[0]} b={myPick.pick[1]} big tone="ink" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>
                  {done ? "Tip predan" : locked ? "Tip zaključan" : "Tip predan"}
                </div>
                <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12, color: C.muted }}>
                  {done
                    ? "Utakmica završena"
                    : locked
                      ? "Utakmica je počela"
                      : "Tip je konačan - vidiš tuđe tipove i možeš izazivati"}
                </div>
                <KnockoutMeta
                  text={knockoutParts({
                    extraTime: myPick.extraTimePick ?? null,
                    penalty: myPick.penaltyPick ?? null,
                    winner: myPick.penaltyWinnerPick ?? null,
                    home: m.home,
                    away: m.away,
                  })}
                />
              </div>
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
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontFamily: FONT.anton, fontSize: 22, color: myDuel.won ? C.green : C.ink }}>+{duelPoints.toFixed(2)}</span>
                {duelSecondary != null && (
                  <span style={{ fontFamily: FONT.archivo, fontWeight: 700, fontSize: 10.5, color: C.faint }}>
                    {scoringMode === "old" ? "M2" : "staro"} {duelSecondary.toFixed(2)}
                  </span>
                )}
              </span>
            </div>
          )}

          {done && m.friendly && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2", textAlign: "center", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.muted }}>
              Probna utakmica - ne ulazi u bodovanje.
            </div>
          )}

          {scoringMode === "old" && oldBreakdown && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2" }}>
              {oldBreakdown.exact ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.green }}>🎯 Točan rezultat!</span>
                  <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.green }}>+{oldBreakdown.total.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <BreakLine label="Gaussova krivulja (blizina)" val={oldBreakdown.gauss} />
                  <BreakLine label="Bonus za broj golova" val={oldBreakdown.bonus} />
                  <TotalLine val={oldBreakdown.total} />
                </>
              )}
            </div>
          )}

          {scoringMode === "m2" && m2Breakdown && <M2BreakdownView breakdown={m2Breakdown} />}
        </div>

        <SectionTitle right={!done && others.length && !locked ? <Tag tone="gold">⚡ izazovi</Tag> : null}>Tipovi ekipe</SectionTitle>
        <div style={{ background: C.surface, borderRadius: 18, overflow: "hidden", boxShadow: SHADOW.card }}>
          {!revealOthers ? (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
              Tipni prvo svoj rezultat - tek tada vidiš tipove ekipe (i možeš ih izazvati).
            </div>
          ) : others.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted }}>
              Nitko još nije tipovao.
            </div>
          ) : (
            others.map((o, i) => {
              const pts = pointsOfOther(o, scoringMode);
              return (
                <div key={o.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid #F1F2F5" : "none" }}>
                  <Avatar p={o} size={36} />
                  <div style={{ flex: 1, minWidth: 0, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14.5, color: C.ink }}>{o.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <Score a={o.pick[0]} b={o.pick[1]} tone="ghost" />
                    <KnockoutMeta
                      text={knockoutParts({
                        extraTime: o.extraTimePick,
                        penalty: o.penaltyPick,
                        winner: o.penaltyWinnerPick,
                        home: m.home,
                        away: m.away,
                      })}
                    />
                  </div>
                  {done && pts != null && <Tag tone={pts >= 3 ? "green" : pts >= 1 ? "gold" : "gray"}>+{pts.toFixed(2)}</Tag>}
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
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function KnockoutMeta({ text, light }: { text: string; light?: boolean }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: 10.5,
        color: light ? "rgba(255,255,255,.72)" : C.faint,
        lineHeight: 1.25,
        textAlign: light ? "center" : "inherit",
        marginTop: light ? 0 : 3,
      }}
    >
      {text}
    </div>
  );
}

function M2BreakdownView({ breakdown }: { breakdown: M2PredictionScoreBreakdown }) {
  if (breakdown.kind === "standard") {
    return (
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2" }}>
        <StandardM2Lines breakdown={breakdown.base} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ECEEF2" }}>
      <BreakText label="90 min" val={m2BranchLabel(breakdown.base.branch)} />
      <BreakLine label="90 min bodovi" val={breakdown.base.total} />
      {breakdown.extraTime && <ExtraTimeLines extraTime={breakdown.extraTime} />}
      {breakdown.penalties && <PenaltyLines penalties={breakdown.penalties} />}
      <TotalLine val={breakdown.total} />
    </div>
  );
}

function StandardM2Lines({ breakdown }: { breakdown: M2ScoreBreakdown }) {
  if (breakdown.exact) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.green }}>🎯 Točan rezultat!</span>
        <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.green }}>+{breakdown.total.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <>
      <BreakText label="M2 grana" val={m2BranchLabel(breakdown.branch)} />
      <BreakLine label="g - blizina rezultata" val={breakdown.gauss} />
      <BreakText label="s - pogođeni golovi momčadi" val={`${breakdown.goalHits}`} />
      <TotalLine val={breakdown.total} />
    </>
  );
}

function ExtraTimeLines({
  extraTime,
}: {
  extraTime: NonNullable<M2PredictionScoreBreakdown["extraTime"]>;
}) {
  if (extraTime.state === "unlocked" && extraTime.breakdown) {
    return (
      <>
        <BreakText label="Produžetak" val={m2BranchLabel(extraTime.breakdown.branch)} />
        <BreakLine label="Produžetak M2 / 3" val={extraTime.total} />
      </>
    );
  }
  if (extraTime.state === "voided") return <BreakText label="Produžetak" val="poništeno" />;
  if (extraTime.state === "missing-pick") return <BreakText label="Produžetak" val="nema tipa" />;
  if (extraTime.state === "missing-result") return <BreakText label="Produžetak" val="nema rezultata" />;
  if (extraTime.pick || extraTime.res) return <BreakText label="Produžetak" val="nije otključano" />;
  return null;
}

function PenaltyLines({
  penalties,
}: {
  penalties: NonNullable<M2PredictionScoreBreakdown["penalties"]>;
}) {
  if (penalties.state === "unlocked") {
    return (
      <>
        <BreakText label="Penali" val={penalties.correct ? "prolaznik pogođen" : "prolaznik promašen"} />
        <BreakLine label="Bonus penala" val={penalties.total} />
      </>
    );
  }
  if (penalties.state === "voided") return <BreakText label="Penali" val="poništeno" />;
  if (penalties.state === "missing-pick") return <BreakText label="Penali" val="nema tipa" />;
  if (penalties.state === "missing-result") return <BreakText label="Penali" val="nema rezultata" />;
  if (penalties.pick || penalties.penaltyPick || penalties.penaltyRes) return <BreakText label="Penali" val="nije otključano" />;
  return null;
}

function BreakText({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", gap: 12 }}>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted3 }}>{label}</span>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink }}>{val}</span>
    </div>
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

function TotalLine({ val }: { val: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F2F5" }}>
      <span style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, color: C.ink }}>Ukupno</span>
      <span style={{ fontFamily: FONT.anton, fontSize: 22, color: C.ink }}>+{val.toFixed(2)}</span>
    </div>
  );
}
