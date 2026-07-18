// Learning layer types — organizational memory from human overrides

export type OverrideType =
  | "rejected_action"        // Agent rejected an AI-proposed action
  | "edited_draft"           // Agent edited the AI-generated response draft
  | "escalated_false_positive" // AI escalated but manager said it was fine
  | "forced_action"          // Agent forced an action the AI marked as unsafe
  | "plan_modified"          // Agent modified the resolution plan
  | "resolved_differently";  // Agent resolved via a different action than proposed

export interface LearningEntry {
  id: string;
  caseId?: string;
  caseNumber?: string;
  customerId?: string;
  customerName?: string;
  overrideType: OverrideType;
  originalDecision: {
    action?: string;
    planGoal?: string;
    confidence?: number;
    automationSafe?: boolean;
  };
  humanDecision: {
    action?: string;
    note?: string;
  };
  context: {
    intent?: string;
    sentiment?: string;
    urgency?: string;
    orderTotalCents?: number;
    policyCodes?: string[];
  };
  feedbackNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

export interface LearningSignal {
  similarOverrides: number;
  overrideRate: number;          // 0-1: similarOverrides / similarCases
  confidenceDelta: number;       // -0.3 to +0.3: how much to adjust confidence
  adjustedConfidence: number;    // original + delta, clamped 0-1
  trend: "improving" | "stable" | "degrading";
  note: string;
  recentOverrides: LearningEntry[];
}

export interface RecordOverrideInput {
  caseId: string;
  overrideType: OverrideType;
  originalDecision: LearningEntry["originalDecision"];
  humanDecision: LearningEntry["humanDecision"];
  context: LearningEntry["context"];
  feedbackNote?: string;
}
