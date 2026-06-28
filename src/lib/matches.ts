import type { MatchStage } from "@/lib/types";

const KNOCKOUT_GROUP_LABELS: Record<string, string> = {
  R32: "1/16 finala",
  "1/16": "1/16 finala",
  R16: "Osmina finala",
  OF: "Osmina finala",
  "1/8": "Osmina finala",
  QF: "Cetvrtfinale",
  CF: "Cetvrtfinale",
  "1/4": "Cetvrtfinale",
  SF: "Polufinale",
  PF: "Polufinale",
  "1/2": "Polufinale",
  BRONZE: "Za 3. mjesto",
  "3P": "Za 3. mjesto",
  F: "Finale",
  FINAL: "Finale",
};

export function isKnockoutMatch(m: {
  stage?: MatchStage;
  group?: string;
  friendly?: boolean;
}): boolean {
  if (m.friendly) return false;
  if (m.stage === "knockout") return true;
  const group = (m.group ?? "").trim().toUpperCase();
  return group in KNOCKOUT_GROUP_LABELS;
}

export function matchStageLabel(m: {
  stage?: MatchStage;
  group?: string;
  friendly?: boolean;
}): string {
  if (m.friendly) return "Prijateljska";
  const group = (m.group ?? "").trim();
  const upper = group.toUpperCase();
  if (isKnockoutMatch(m)) return KNOCKOUT_GROUP_LABELS[upper] ?? "Knockout";
  return group ? `Grupa ${group}` : "Utakmica";
}
