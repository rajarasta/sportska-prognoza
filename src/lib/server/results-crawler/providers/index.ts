// Provider registry — selects a results source by the RESULTS_PROVIDER env var.
// Defaults to the safe `mock` provider (no external calls) so nothing reaches out
// unless explicitly configured.
import type { ResultsProvider } from "@/lib/server/results-crawler/types";
import { MockProvider } from "@/lib/server/results-crawler/providers/mock";
import { TheSportsDbProvider } from "@/lib/server/results-crawler/providers/thesportsdb";

export type ProviderName = "mock" | "thesportsdb";

export function selectProvider(name = process.env.RESULTS_PROVIDER): ResultsProvider {
  switch ((name || "mock").toLowerCase()) {
    case "thesportsdb":
      return new TheSportsDbProvider();
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown RESULTS_PROVIDER "${name}" (expected: mock | thesportsdb)`);
  }
}
