import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getMatch, getMyPick } from "@/lib/server/queries";
import TipEntryClient from "./TipEntryClient";

export const dynamic = "force-dynamic";

export default async function UnosPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const { uid } = await requireUser();

  const match = await getMatch(matchId);
  if (!match) notFound();

  const locked = match.status !== "upcoming" || Date.now() >= match.kickoff;
  if (locked) redirect(`/match/${matchId}`);

  const myPick = await getMyPick(uid, matchId);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zagreb" });

  return (
    <TipEntryClient
      match={{ id: match.id, group: match.group, friendly: match.friendly ?? false, home: match.home, away: match.away, date: match.date, time: match.time }}
      initial={myPick?.pick ?? null}
      today={today}
    />
  );
}
