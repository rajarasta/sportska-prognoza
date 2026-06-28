import { requireUser } from "@/lib/server/session";
import { getLeaderboard } from "@/lib/server/queries";
import Leaderboard from "./Leaderboard";

export const dynamic = "force-dynamic";

export default async function BodoviPage() {
  const { uid } = await requireUser();
  const standings = await getLeaderboard(uid);
  return <Leaderboard standings={standings} />;
}
