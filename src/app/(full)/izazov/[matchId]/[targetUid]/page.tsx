import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getChallengeContext } from "@/lib/server/izazovi";
import { kickoffLabel } from "@/lib/data/season";
import ChallengeSetupClient from "./ChallengeSetupClient";

export const dynamic = "force-dynamic";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ matchId: string; targetUid: string }>;
}) {
  const { matchId, targetUid } = await params;
  const { uid } = await requireUser();

  const ctx = await getChallengeContext(matchId, targetUid, uid);
  if (!ctx) notFound();

  const locked = ctx.match.status !== "upcoming" || Date.now() >= ctx.match.kickoff;
  if (locked) redirect(`/match/${matchId}`);

  return (
    <ChallengeSetupClient
      ctx={{
        matchId: ctx.match.id,
        home: ctx.match.home,
        away: ctx.match.away,
        time: kickoffLabel(ctx.match.date, ctx.match.kickoff),
        myPick: ctx.myPick,
        targetUid: ctx.targetUid,
        targetName: ctx.targetName,
        targetInit: ctx.targetInit,
        targetColor: ctx.targetColor,
        targetPick: ctx.targetPick,
      }}
    />
  );
}
