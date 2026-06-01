import { requireUser } from "@/lib/server/session";
import { getConfig, getLeaderboard } from "@/lib/server/queries";
import Leaderboard from "./Leaderboard";

export const dynamic = "force-dynamic";

export default async function BodoviPage() {
  const { uid } = await requireUser();
  const [standings, cfg] = await Promise.all([getLeaderboard(uid), getConfig()]);
  return <Leaderboard standings={standings} weeks={cfg?.weeks ?? []} />;
}
