import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail, getAdminEmails } from "@/lib/server/allowlist";
import { getAllMatches, getAllowlist } from "@/lib/server/queries";
import AdminClient, { type AdminMatch } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { email } = await requireUser();
  if (!isAdminEmail(email)) redirect("/bodovi");

  const [matches, allowlist] = await Promise.all([getAllMatches(), getAllowlist()]);
  const adminEmails = getAdminEmails();
  const list: AdminMatch[] = matches
    .slice()
    .sort((a, b) => a.kickoff - b.kickoff) // chronological: today's trial friendlies on top
    .map((m) => ({
      id: m.id,
      no: m.no,
      group: m.group,
      stage: m.stage,
      friendly: m.friendly ?? false,
      home: m.home,
      away: m.away,
      date: m.date,
      time: m.time,
      status: m.status,
      res: m.res,
      extraTimeRes: m.extraTimeRes ?? null,
      penaltyRes: m.penaltyRes ?? null,
      winner: m.winner ?? null,
    }));

  return <AdminClient matches={list} allowlist={allowlist} adminEmails={adminEmails} />;
}
