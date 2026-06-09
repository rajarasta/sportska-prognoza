// Offline e2e of the live write path against an in-memory fake Firestore (no
// network, no prod). Exercises the REAL ingestSnapshot → runProvisional (live) and
// → runRecompute (final) on seeded matches/predictions/users. Run:
//   npx tsx scripts/verify-live-ingest.ts
import type { Firestore } from "firebase-admin/firestore";
import { ingestSnapshot } from "../src/lib/server/live/ingest";
import type { Snapshot } from "../src/lib/server/live/schema";

// ── minimal in-memory Firestore (only the surface the di'd functions use) ──
type Doc = Record<string, unknown> & { id?: string };
class FakeDB {
  store = new Map<string, Map<string, Doc>>();
  col(name: string) {
    let c = this.store.get(name);
    if (!c) this.store.set(name, (c = new Map()));
    return c;
  }
  seed(name: string, id: string, data: Doc) {
    this.col(name).set(id, { ...data });
  }
  collection(name: string) {
    const self = this;
    return {
      get: async () => ({
        docs: [...self.col(name).entries()].map(([id, data]) => ({ id, data: () => ({ ...data }) })),
      }),
      doc: (id: string) => ({
        get: async () => {
          const d = self.col(name).get(id);
          return { exists: !!d, data: () => (d ? { ...d } : undefined) };
        },
        update: async (patch: Doc) => Object.assign(self.col(name).get(id) ?? self.col(name).set(id, {}).get(id)!, patch),
        _ref: { name, id },
      }),
    };
  }
  bulkWriter() {
    const self = this;
    return {
      update: (ref: { _ref: { name: string; id: string } }, patch: Doc) => {
        const c = self.col(ref._ref.name);
        const cur = c.get(ref._ref.id) ?? {};
        c.set(ref._ref.id, Object.assign(cur, patch));
      },
      close: async () => {},
    };
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.log(`✗ ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${msg}`);
  }
}

async function main() {
  const db = new FakeDB();
  db.seed("leagueConfig", "default", { sigma: 1.9, exactPoints: 3, goalBonus: 0.3 });
  // m001: Meksiko – Južna Afrika on 2026-06-11
  db.seed("matches", "m001", { id: "m001", no: 1, group: "A", date: "2026-06-11", time: "13:00", kickoff: 0, week: 1, home: "MEX", away: "RSA", status: "upcoming", res: null });
  db.seed("matches", "m002", { id: "m002", no: 2, group: "A", date: "2026-06-11", time: "15:00", kickoff: 0, week: 1, home: "KOR", away: "CZE", status: "upcoming", res: null });
  db.seed("users", "u1", { uid: "u1", name: "Ana", totalPoints: 0, exactCount: 0, weeklyPoints: {} });
  db.seed("users", "u2", { uid: "u2", name: "Bram", totalPoints: 0, exactCount: 0, weeklyPoints: {} });
  // u1 tips 2:1 on m001 (will be exact at final), u2 tips 0:0
  db.seed("predictions", "m001_u1", { id: "m001_u1", matchId: "m001", uid: "u1", pick: [2, 1], submittedAt: 0, points: null, exact: null });
  db.seed("predictions", "m001_u2", { id: "m001_u2", matchId: "m001", uid: "u2", pick: [0, 0], submittedAt: 0, points: null, exact: null });

  const fdb = db as unknown as Firestore;

  // 1. LIVE snapshot: Meksiko 1:0 RSA at 55'
  const liveSnap: Snapshot = {
    version: 1, source: "test", capturedAt: 1, date: "2026-06-11",
    fixtures: [{ home: "Meksiko", away: "Južna Afrika", score: [1, 0], minute: 55, status: "live" }],
  };
  const r1 = await ingestSnapshot(fdb, liveSnap, { now: 123 });
  assert(r1.liveUpdated.includes("m001") && r1.unresolved.length === 0, "live: m001 resolved + marked live, 0 unresolved");
  const m001a = db.col("matches").get("m001")!;
  assert(m001a.status === "live" && JSON.stringify(m001a.liveRes) === "[1,0]" && m001a.minute === 55, "live: liveRes/minute/status written");
  const p1a = db.col("predictions").get("m001_u1")!;
  assert(typeof p1a.provPoints === "number" && (p1a.provPoints as number) > 0, `live: u1 provPoints set (${p1a.provPoints})`);
  const u1a = db.col("users").get("u1")!;
  assert((u1a.provTotalPoints as number) > 0 && (u1a.totalPoints as number) === 0, "live: u1 provTotal>0 but final total still 0");

  // 2. FINAL snapshot: Meksiko 2:1 RSA (u1 exact)
  const finalSnap: Snapshot = {
    version: 1, source: "test", capturedAt: 2, date: "2026-06-11",
    fixtures: [{ home: "Meksiko", away: "Južna Afrika", score: [2, 1], status: "final" }],
  };
  const r2 = await ingestSnapshot(fdb, finalSnap, { now: 456 });
  assert(r2.finalized.includes("m001") && r2.recomputed && r2.provisionalRan, "final: m001 finalized + recompute + provisional ran");
  const m001b = db.col("matches").get("m001")!;
  assert(m001b.status === "final" && JSON.stringify(m001b.res) === "[2,1]" && m001b.liveRes === null && m001b.minute === null, "final: res set, live fields cleared");
  const p1b = db.col("predictions").get("m001_u1")!;
  assert(p1b.points === 3 && p1b.exact === true, "final: u1 exact → 3 banked points");
  assert(p1b.provPoints === null, "final: u1 provPoints cleared after finalize");
  const u1b = db.col("users").get("u1")!;
  assert((u1b.totalPoints as number) === 3 && (u1b.provTotalPoints as number) === 3, "final: u1 totalPoints=3, provTotal=3 (no live left)");

  // 3. Idempotency: re-ingest the final snapshot → skipped, no change
  const r3 = await ingestSnapshot(fdb, finalSnap, { now: 789 });
  assert(r3.skippedFinal.includes("m001") && r3.finalized.length === 0 && !r3.recomputed, "idempotent: re-ingesting final skips (never overwrites)");

  console.log(process.exitCode ? "\nSOME CHECKS FAILED" : "\nAll ingest checks passed.");
}

main().catch((e) => {
  console.error("verify-live-ingest failed:", e);
  process.exit(1);
});
