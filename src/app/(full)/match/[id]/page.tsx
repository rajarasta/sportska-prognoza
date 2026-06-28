import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getMatchDetail } from "@/lib/server/queries";
import MatchDetailClient from "./MatchDetailClient";

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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zagreb" });
  return <MatchDetailClient data={data} today={today} />;
}
