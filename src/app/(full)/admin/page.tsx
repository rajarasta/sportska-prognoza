import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail } from "@/lib/server/allowlist";
import { getAllMatches } from "@/lib/server/queries";
import AdminClient, { type AdminMatch } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { email } = await requireUser();
  if (!isAdminEmail(email)) redirect("/bodovi");

  const matches = await getAllMatches();
  const list: AdminMatch[] = matches
    .slice()
    .sort((a, b) => a.no - b.no)
    .map((m) => ({
      id: m.id,
      no: m.no,
      group: m.group,
      home: m.home,
      away: m.away,
      date: m.date,
      time: m.time,
      status: m.status,
      res: m.res,
    }));

  return <AdminClient matches={list} />;
}
