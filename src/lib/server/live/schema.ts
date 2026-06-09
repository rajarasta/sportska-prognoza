// Wire contract for live-score snapshots — the seam between the Hermes browser
// agent (which scrapes a live-score site and writes JSON files) and the watcher
// (which ingests them). Pure: zod only, no firebase, no `server-only`, so both the
// Next.js side and the standalone tsx watcher can import it.
import { z } from "zod";

export const SNAPSHOT_VERSION = 1 as const;

// One fixture as the agent distilled it from the site. The agent knows team NAMES
// (Croatian, as shown on the site) — not our internal match ids; the watcher
// resolves names → matchId by date + alias. Optional FIFA codes bypass name matching.
export const FixtureSnapshotSchema = z.object({
  home: z.string().min(1),
  away: z.string().min(1),
  homeCode: z.string().length(3).optional(),
  awayCode: z.string().length(3).optional(),
  // null = not started / score unknown (watcher ignores it — never blanks a live score)
  score: z
    .tuple([z.number().int().min(0).max(99), z.number().int().min(0).max(99)])
    .nullable(),
  minute: z.number().int().min(0).max(130).nullable().optional(),
  status: z.enum(["upcoming", "live", "final"]),
});

export const SnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  source: z.string().min(1), // e.g. the live-score site host
  capturedAt: z.number().int(), // epoch ms when scraped
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // matchday (Europe/Zagreb) — scopes resolution
  fixtures: z.array(FixtureSnapshotSchema),
});

export type FixtureSnapshot = z.infer<typeof FixtureSnapshotSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;

/** Validate a parsed JSON object as a Snapshot. Throws ZodError on any mismatch. */
export function parseSnapshot(raw: unknown): Snapshot {
  return SnapshotSchema.parse(raw);
}
