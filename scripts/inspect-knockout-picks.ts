// Read-only: dump every prediction's knockout fields (pick, extraTimePick,
// penaltyWinnerPick, penaltyPick) for the drawn-after-90 games, so we can confirm
// the extra-time convention (ET-only goals vs cumulative 120') from real data.
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../src/lib/collections";
import { TEAMS, UNKNOWN_TEAM } from "../src/lib/data/teams";
import type { MatchDoc, PredictionDoc, UserDoc, Scoreline, MatchWinner } from "../src/lib/types";

const name = (c: string) => (TEAMS[c] ?? UNKNOWN_TEAM).name;
const sl = (s: Scoreline | null | undefined) => (s ? `${s[0]}:${s[1]}` : "—");
const IDS = ["m086", "m087", "m096"];

async function main() {
  const app = getApps().length ? getApps()[0] : initializeApp();
  const db = getFirestore(app);
  const [mSnap, pSnap, uSnap] = await Promise.all([
    db.collection(COLLECTIONS.matches).get(),
    db.collection(COLLECTIONS.predictions).get(),
    db.collection(COLLECTIONS.users).get(),
  ]);
  const matchById = new Map(mSnap.docs.map((d) => [d.id, d.data() as MatchDoc]));
  const userByUid = new Map(uSnap.docs.map((d) => [d.id, d.data() as UserDoc]));
  const preds = pSnap.docs.map((d) => d.data() as PredictionDoc);

  for (const id of IDS) {
    const m = matchById.get(id)!;
    console.log(`\n#${m.no} ${name(m.home)} – ${name(m.away)} [${m.group}]`);
    const list = preds.filter((p) => p.matchId === id);
    for (const p of list) {
      const et = (p as PredictionDoc & { extraTimePick?: Scoreline | null }).extraTimePick;
      const pw = (p as PredictionDoc & { penaltyWinnerPick?: MatchWinner | null }).penaltyWinnerPick;
      const pp = (p as PredictionDoc & { penaltyPick?: Scoreline | null }).penaltyPick;
      const nm = userByUid.get(p.uid)?.name ?? p.uid;
      const hasKo = et != null || pw != null || pp != null;
      console.log(
        `   ${nm.padEnd(20)} 90'=${sl(p.pick).padEnd(4)}` +
          (hasKo ? `  ET=${sl(et)}  penWinner=${pw ?? "—"}  penPick=${sl(pp)}` : "  (bez produžetak/penal tipa)"),
      );
    }
  }
  console.log("");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
