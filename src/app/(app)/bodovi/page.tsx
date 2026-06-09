import { requireUser } from "@/lib/server/session";
import { anyLive, getAllMatches, getConfig, getLeaderboard } from "@/lib/server/queries";
import Leaderboard from "./Leaderboard";

export const dynamic = "force-dynamic";

export default async function BodoviPage() {
  const { uid } = await requireUser();
  const [standings, cfg, matches] = await Promise.all([
    getLeaderboard(uid),
    getConfig(),
    getAllMatches(),
  ]);
  return <Leaderboard standings={standings} weeks={cfg?.weeks ?? []} live={anyLive(matches)} />;
}
