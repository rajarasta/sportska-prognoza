// Mock results provider — the safe default. Returns scorelines from the
// MOCK_RESULTS env var (JSON keyed by match id), intersected with the matches the
// crawler actually asked about. Lets the whole pipeline be exercised end-to-end
// with zero external calls.
//
//   MOCK_RESULTS='{"t001":[2,1],"t002":[0,0],"t003":[3,2]}'
import type { DueMatch, ResultsProvider, Scoreline } from "@/lib/server/results-crawler/types";

function parseMockEnv(raw: string | undefined): Map<string, Scoreline> {
  const out = new Map<string, Scoreline>();
  if (!raw) return out;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error("MOCK_RESULTS is not valid JSON");
  }
  if (obj && typeof obj === "object") {
    for (const [id, val] of Object.entries(obj as Record<string, unknown>)) {
      if (
        Array.isArray(val) &&
        val.length === 2 &&
        Number.isInteger(val[0]) &&
        Number.isInteger(val[1])
      ) {
        out.set(id, [val[0] as number, val[1] as number]);
      }
    }
  }
  return out;
}

export class MockProvider implements ResultsProvider {
  readonly name = "mock";
  private readonly results: Map<string, Scoreline>;

  constructor(raw = process.env.MOCK_RESULTS) {
    this.results = parseMockEnv(raw);
  }

  async fetchFinals(due: DueMatch[]): Promise<Map<string, Scoreline>> {
    const out = new Map<string, Scoreline>();
    for (const m of due) {
      const r = this.results.get(m.id);
      if (r) out.set(m.id, r);
    }
    return out;
  }
}
