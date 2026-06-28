import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getPlayerProfile } from "@/lib/server/queries";
import PlayerProfileClient from "./PlayerProfileClient";

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

  return <PlayerProfileClient data={data} />;
}
