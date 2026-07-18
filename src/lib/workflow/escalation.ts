import type { CaseRecord, AIClassification } from "@/types";

export interface EscalationSummary {
  caseId: string;
  caseNumber: string;
  customerName: string;
  reason: string;
  priority: "high" | "medium" | "low";
  recommendedAction: string;
  aiSummary: string;
  suggestedResponse: string;
  createdAt: string;
}

export function buildEscalationSummary(
  caseRecord: CaseRecord,
  customerName: string,
  classification: AIClassification
): EscalationSummary {
  const plan = caseRecord.resolutionPlan;
  const priority: EscalationSummary["priority"] =
    classification.urgency === "critical"
      ? "high"
      : classification.urgency === "high"
      ? "high"
      : classification.urgency === "medium"
      ? "medium"
      : "low";

  return {
    caseId: caseRecord.id,
    caseNumber: caseRecord.caseNumber,
    customerName,
    reason: caseRecord.escalationReason ?? "Manual escalation requested.",
    priority,
    recommendedAction:
      plan?.workflowSteps.find((s) => !s.safeToAuto)?.label ?? "Review case and decide on appropriate action.",
    aiSummary: `Intent: ${classification.intent}. Sentiment: ${classification.sentiment} (${classification.sentimentScore.toFixed(2)}). Urgency: ${classification.urgency}. Confidence: ${(classification.confidence * 100).toFixed(0)}%. ${
      plan ? `Proposed approach: ${plan.approach}` : ""
    }`,
    suggestedResponse:
      caseRecord.responseDraft ??
      "Hi {first name}, thank you for reaching out. I've personally reviewed your case and wanted to follow up. — Senior Agent",
    createdAt: new Date().toISOString(),
  };
}
