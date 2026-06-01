import { requireUser } from "@/lib/server/session";
import { getConfig, getMatchViews } from "@/lib/server/queries";
import RasporedClient from "./RasporedClient";

export const dynamic = "force-dynamic";

export default async function RasporedPage() {
  const { uid } = await requireUser();
  const [matches, cfg] = await Promise.all([getMatchViews(uid), getConfig()]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zagreb" });
  return <RasporedClient matches={matches} weeks={cfg?.weeks ?? []} today={today} nowMs={Date.now()} />;
}
