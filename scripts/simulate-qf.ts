// Read-only preview: overlay the 11 not-yet-committed knockout results in memory
// and compute EXACTLY what runRecompute would produce (both the Gaussian "old"
// total and the M2 total), then print per-match points for every player and the
// before→after leaderboard. Writes NOTHING to Firestore.
//
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/simulate-qf.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, CONFIG_DOC_ID } from "../src/lib/collections";
import { scorePick, isExact, DEFAULT_SCORE_CONFIG, M2_EXACT_POINTS, type ScoreConfig } from "../src/lib/scoring";
import { scorePredictionForMatchM2, scoreDuelParticipantForMatchM2 } from "../src/lib/m2";
import { resolveDuel } from "../src/lib/duels";
import { TEAMS, UNKNOWN_TEAM } from "../src/lib/data/teams";
import type { DuelDoc, LeagueConfigDoc, MatchDoc, PredictionDoc, Scoreline, MatchWinner, UserDoc } from "../src/lib/types";

const name = (c: string) => (TEAMS[c] ?? UNKNOWN_TEAM).name;
const round2 = (n: number) => Math.round(n * 100) / 100;
const f = (n: number | null | undefined) => (n == null ? "  -  " : n.toFixed(2).padStart(6));
const sl = (s: Scoreline | null | undefined) => (s ? `${s[0]}:${s[1]}` : "—");
const key = (uid: string, matchId: string) => `${uid}|${matchId}`;

// The 11 proposed results (same as enter-knockout-results.ts).
const OVERLAY: Record<string, { res: Scoreline; extraTimeRes?: Scoreline; penaltyRes?: Scoreline; winner: MatchWinner }> = {
  m086: { res: [1, 1], extraTimeRes: [0, 0], penaltyRes: [2, 4], winner: "away" },
  m087: { res: [1, 1], extraTimeRes: [2, 1], winner: "home" },
  m088: { res: [1, 0], winner: "home" },
  m089: { res: [0, 3], winner: "away" },
  m090: { res: [0, 1], winner: "away" },
  m091: { res: [1, 2], winner: "away" },
  m092: { res: [2, 3], winner: "away" },
  m093: { res: [0, 1], winner: "away" },
  m094: { res: [1, 4], winner: "away" },
  m095: { res: [3, 2], winner: "home" },
  m096: { res: [0, 0], extraTimeRes: [0, 0], penaltyRes: [4, 3], winner: "home" },
};

function scoreConfigFrom(cfg: LeagueConfigDoc | null): ScoreConfig {
  if (!cfg) return DEFAULT_SCORE_CONFIG;
  return { sigma: cfg.sigma, exactPoints: cfg.exactPoints, goalBonus: cfg.goalBonus };
}

async function main() {
  const app = getApps().length ? getApps()[0] : initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const [cfgSnap, matchesSnap, predsSnap, duelsSnap, usersSnap] = await Promise.all([
    db.collection(COLLECTIONS.config).doc(CONFIG_DOC_ID).get(),
    db.collection(COLLECTIONS.matches).get(),
    db.collection(COLLECTIONS.predictions).get(),
    db.collection(COLLECTIONS.duels).get(),
    db.collection(COLLECTIONS.users).get(),
  ]);
  const cfg = cfgSnap.exists ? (cfgSnap.data() as LeagueConfigDoc) : null;
  const sc = scoreConfigFrom(cfg);

  const matches = matchesSnap.docs.map((d) => d.data() as MatchDoc);
  // Overlay the proposed results in memory.
  for (const m of matches) {
    const o = OVERLAY[m.id];
    if (o) {
      m.res = o.res;
      m.extraTimeRes = o.extraTimeRes ?? null;
      m.penaltyRes = o.penaltyRes ?? null;
      m.winner = o.winner;
      m.status = "final";
    }
  }
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const preds = predsSnap.docs.map((d) => d.data() as PredictionDoc);
  const duels = duelsSnap.docs.map((d) => d.data() as DuelDoc);
  const users = usersSnap.docs.map((d) => d.data() as UserDoc);
  const userByUid = new Map(users.map((u) => [u.uid, u]));

  const isFinal = (m: MatchDoc | undefined): m is MatchDoc & { res: Scoreline } => !!m && m.status === "final" && !!m.res;
  const counts = (m: MatchDoc | undefined): m is MatchDoc & { res: Scoreline } => isFinal(m) && !m.friendly;

  // Mirror recompute: base + M2 per prediction.
  const basePoints = new Map<string, number>();
  const m2BasePoints = new Map<string, number>();
  const exactByUid = new Map<string, number>();
  for (const p of preds) {
    const m = matchById.get(p.matchId);
    if (!counts(m)) continue;
    basePoints.set(key(p.uid, p.matchId), scorePick(p.pick, m.res, sc).total);
    m2BasePoints.set(key(p.uid, p.matchId), scorePredictionForMatchM2(p, m).total);
    if (isExact(p.pick, m.res)) exactByUid.set(p.uid, (exactByUid.get(p.uid) ?? 0) + 1);
  }

  // Duel overrides (base + M2).
  const override = new Map<string, number>();
  const m2Override = new Map<string, number>();
  const duelNote = new Map<string, string>();
  for (const d of duels) {
    const m = matchById.get(d.matchId);
    if (!counts(m)) continue;
    const out = resolveDuel(d.challengerPick, d.opponentPick, m.res, sc);
    override.set(key(d.challengerUid, d.matchId), out.challengerPoints);
    override.set(key(d.opponentUid, d.matchId), out.opponentPoints);
    const cEx = isExact(d.challengerPick, m.res);
    const oEx = isExact(d.opponentPick, m.res);
    if (cEx) {
      m2Override.set(key(d.challengerUid, d.matchId), 2 * M2_EXACT_POINTS);
      m2Override.set(key(d.opponentUid, d.matchId), 0);
    } else if (oEx) {
      m2Override.set(key(d.challengerUid, d.matchId), 0);
      m2Override.set(key(d.opponentUid, d.matchId), 2 * M2_EXACT_POINTS);
    } else {
      m2Override.set(key(d.challengerUid, d.matchId), scoreDuelParticipantForMatchM2(d, m, "challenger").total);
      m2Override.set(key(d.opponentUid, d.matchId), scoreDuelParticipantForMatchM2(d, m, "opponent").total);
    }
    duelNote.set(key(d.challengerUid, d.matchId), "izazov");
    duelNote.set(key(d.opponentUid, d.matchId), "izazov");
  }

  // Per-match breakdown for the 11 overlaid games.
  const predByMatch = new Map<string, PredictionDoc[]>();
  for (const p of preds) {
    if (!OVERLAY[p.matchId]) continue;
    (predByMatch.get(p.matchId) ?? predByMatch.set(p.matchId, []).get(p.matchId)!).push(p);
  }

  console.log("\n================  PROGNOZE + BODOVI ZA 11 NOVIH REZULTATA  ================");
  for (const id of Object.keys(OVERLAY)) {
    const m = matchById.get(id)!;
    const extra = (m.extraTimeRes ? ` ET ${sl(m.extraTimeRes)}` : "") + (m.penaltyRes ? ` PEN ${sl(m.penaltyRes)}` : "");
    const adv = m.winner === "home" ? m.home : m.away;
    console.log(`\n#${m.no} [${m.group}] ${name(m.home)} ${sl(m.res)} ${name(m.away)}${extra}  ⇒ ${name(adv!)}`);
    console.log(`   ${"Igrač".padEnd(20)} ${"Tip".padEnd(6)} ${"Gauss".padStart(6)} ${"M2".padStart(6)}  napomena`);
    const list = (predByMatch.get(id) ?? []).sort((a, b) => (m2BasePoints.get(key(b.uid, id)) ?? 0) - (m2BasePoints.get(key(a.uid, id)) ?? 0));
    if (!list.length) console.log("   (nema tipova)");
    for (const p of list) {
      const k = key(p.uid, id);
      const g = override.has(k) ? override.get(k)! : basePoints.get(k) ?? 0;
      const m2 = m2Override.has(k) ? m2Override.get(k)! : m2BasePoints.get(k) ?? 0;
      const ex = isExact(p.pick, m.res!) ? "✓" : " ";
      console.log(`   ${(userByUid.get(p.uid)?.name ?? p.uid).padEnd(20)} ${(sl(p.pick) + ex).padEnd(6)} ${f(g)} ${f(m2)}  ${duelNote.get(k) ?? ""}`);
    }
  }

  // Aggregate new totals (all counting matches, incl. the overlay).
  type Agg = { total: number; m2Total: number; exact: number };
  const agg = new Map<string, Agg>();
  const ensure = (uid: string) => agg.get(uid) ?? agg.set(uid, { total: 0, m2Total: 0, exact: 0 }).get(uid)!;
  users.forEach((u) => ensure(u.uid));
  for (const kk of new Set([...basePoints.keys(), ...override.keys()])) {
    const [uid] = kk.split("|");
    ensure(uid).total += override.has(kk) ? override.get(kk)! : basePoints.get(kk)!;
  }
  for (const kk of new Set([...m2BasePoints.keys(), ...m2Override.keys()])) {
    const [uid] = kk.split("|");
    ensure(uid).m2Total += m2Override.has(kk) ? m2Override.get(kk)! : m2BasePoints.get(kk)!;
  }
  for (const [uid, e] of agg) e.exact = exactByUid.get(uid) ?? 0;

  const rows = users.map((u) => ({
    name: u.name,
    oldTotalBefore: round2(u.totalPoints ?? 0),
    oldTotalAfter: round2(agg.get(u.uid)!.total),
    m2Before: round2(u.m2TotalPoints ?? 0),
    m2After: round2(agg.get(u.uid)!.m2Total),
    exact: agg.get(u.uid)!.exact,
  }));

  const printBoard = (title: string, before: (r: typeof rows[number]) => number, after: (r: typeof rows[number]) => number) => {
    const ranked = [...rows].sort((a, b) => after(b) - after(a) || b.exact - a.exact || a.name.localeCompare(b.name));
    console.log(`\n================  ${title}  ================`);
    console.log(` #  ${"Igrač".padEnd(20)} ${"sad".padStart(7)} ${"→ novo".padStart(8)}  ${"Δ".padStart(7)}  toč`);
    ranked.forEach((r, i) => {
      const d = round2(after(r) - before(r));
      const ds = (d >= 0 ? "+" : "") + d.toFixed(2);
      console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(20)} ${before(r).toFixed(2).padStart(7)} ${after(r).toFixed(2).padStart(8)}  ${ds.padStart(7)}  ${r.exact}`);
    });
  };

  printBoard("LJESTVICA — GAUSS (aktivni mod)", (r) => r.oldTotalBefore, (r) => r.oldTotalAfter);
  printBoard("LJESTVICA — M2", (r) => r.m2Before, (r) => r.m2After);
  console.log("\n(read-only simulacija — Firestore NIJE mijenjan)\n");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("simulate-qf failed:", e);
    process.exit(1);
  },
);
