import type { CaseStatus } from "@/types";

// State machine with safe backward transitions for production resilience.
// Cases can move forward through the pipeline, and backward when an action
// fails or an agent needs to re-plan after new information arrives.
const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["classified"],
  classified: ["retrieved", "new"], // back to new if classification is rejected
  retrieved: ["planned", "classified"], // back to classified if retrieval finds the classification was wrong
  planned: ["acted", "retrieved", "classified"], // back if plan needs re-retrieval or re-classification
  acted: ["resolved", "escalated", "planned"], // back to planned if an action fails and needs re-planning
  resolved: ["escalated"], // a "resolved" case can be re-opened as escalated if the customer replies unhappily
  escalated: ["acted", "resolved", "planned"], // escalated cases can be picked up, acted on, or re-planned
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatus(from: CaseStatus): CaseStatus | null {
  // Returns the primary forward transition (first in the list that isn't backward)
  const forward = TRANSITIONS[from]?.[0] ?? null;
  return forward;
}

export function isTerminal(status: CaseStatus): boolean {
  // Resolved is terminal unless re-opened. Escalated is not terminal (can be picked up).
  return status === "resolved";
}

// For display purposes — the lifecycle stage a case is in
export function stageLabel(status: CaseStatus): string {
  switch (status) {
    case "new":
      return "Intake";
    case "classified":
      return "Classified";
    case "retrieved":
      return "Context Retrieved";
    case "planned":
      return "Plan Ready";
    case "acted":
      return "Actions Executed";
    case "resolved":
      return "Resolved";
    case "escalated":
      return "Escalated";
  }
}

// Order of stages for the workflow timeline (forward progression)
export const STAGE_ORDER: CaseStatus[] = [
  "new",
  "classified",
  "retrieved",
  "planned",
  "acted",
  "resolved",
];

// Check if a transition is a "backward" transition (rework)
export function isBackwardTransition(from: CaseStatus, to: CaseStatus): boolean {
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  return toIdx < fromIdx && to !== "escalated";
}
