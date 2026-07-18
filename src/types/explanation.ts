// Decision explainability types

export interface DecisionExplanation {
  topSignals: Array<{
    signal: string;
    weight: number;         // 0-1
    source: "message" | "customer" | "order" | "policy" | "history";
    detail: string;
  }>;
  policyMatches: Array<{
    code: string;
    title: string;
    snippet: string;
    relevance: number;
    passed: boolean;
    reason: string;
  }>;
  confidenceBreakdown: {
    intentConfidence: number;
    sentimentConfidence: number;
    urgencyConfidence: number;
    overall: number;
    factors: Array<{ factor: string; contribution: number; detail: string }>;
  };
  safetyAnalysis: {
    isSafe: boolean;
    reasons: string[];
    guardrails: string[];
  };
  escalationAnalysis?: {
    triggered: boolean;
    reason: string;
    triggeredBy: string;
    recommendedAction: string;
  };
  learningSignals: {
    similarOverrides: number;
    overrideRate: number;
    confidenceDelta: number;
    adjustedConfidence: number;
    note: string;
  };
}
