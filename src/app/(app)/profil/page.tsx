import { requireUser } from "@/lib/server/session";
import { getLeaderboard, getMyHistory } from "@/lib/server/queries";
import ProfilClient from "./ProfilClient";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { uid, name, profile } = await requireUser();
  const [standings, history] = await Promise.all([getLeaderboard(uid), getMyHistory(uid)]);
  const standing = standings.find((s) => s.uid === uid) ?? null;
  const oldRank = standings.findIndex((s) => s.uid === uid) + 1;

  return (
    <ProfilClient
      name={name}
      profile={profile}
      standing={standing}
      oldRank={oldRank || 0}
      history={history}
    />
  );
}
