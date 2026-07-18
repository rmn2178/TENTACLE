// Global application settings — persisted to the server and mirrored in the client store.

export type ResponseTone = "warm_professional" | "concise" | "apologetic";

export interface AppSettings {
  // Automation thresholds (in USD)
  autoRefundLimit: number;        // Refunds at or below this amount can be auto-issued
  autoResolveUnder: number;       // Orders below this value eligible for full autonomous resolution
  highValueThreshold: number;     // Orders at or above this trigger escalation

  // Escalation rules (boolean toggles)
  escalateFurious: boolean;       // Forward furious-sentiment cases to senior agent queue
  escalateHighValue: boolean;     // Escalate high-value order disputes

  // AI behavior
  responseTone: ResponseTone;
  alwaysDraftResponse: boolean;   // Generate response draft even when escalating
  attachSimilarCases: boolean;    // Include similar resolved cases in retrieval context
  requireApprovalAbove: number;   // Refunds above this require manager approval (USD)
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoRefundLimit: 25,
  autoResolveUnder: 25,
  highValueThreshold: 500,
  escalateFurious: true,
  escalateHighValue: true,
  responseTone: "warm_professional",
  alwaysDraftResponse: true,
  attachSimilarCases: true,
  requireApprovalAbove: 100,
};
