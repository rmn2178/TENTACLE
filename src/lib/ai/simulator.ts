import "server-only";
import type { CaseRecord, Customer, Order, ResolutionPlan, WorkflowStep } from "@/types";
import type { BusinessImpactSimulation } from "@/types/simulation";
import { logger } from "@/lib/observability/logger";

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toFixed(2)}`;
}

/**
 * Estimate the probability that a customer stays (retention) after this resolution.
 * Based on customer tier, sentiment, resolution speed, and action type.
 *
 * Tier weights: platinum > gold > silver > standard
 * Sentiment weights: furious is hardest to retain
 * Action weights: refund + replacement > refund only > replacement only > deny
 */
function estimateRetentionProbability(
  customer: Customer,
  sentiment: string | undefined,
  action: string,
  resolutionSpeedMins: number
): number {
  const tierWeight: Record<string, number> = {
    platinum: 0.92,
    gold: 0.85,
    silver: 0.75,
    standard: 0.65,
  };
  const sentimentWeight: Record<string, number> = {
    positive: 1.0,
    neutral: 0.95,
    negative: 0.80,
    frustrated: 0.65,
    furious: 0.40,
  };
  const actionWeight: Record<string, number> = {
    refund: 0.90,
    replacement: 0.88,
    cancel: 0.50,
    issue_credit: 0.85,
    address_update: 0.92,
    send_response: 0.70,
    escalate: 0.60,
    schedule_callback: 0.75,
  };

  const tier = tierWeight[customer.tier] ?? 0.70;
  const sentiment_ = sentimentWeight[sentiment ?? "neutral"] ?? 0.90;
  const action_ = actionWeight[action] ?? 0.75;

  // Faster resolution improves retention
  const speedFactor = resolutionSpeedMins < 5 ? 1.05 : resolutionSpeedMins < 60 ? 1.0 : 0.85;

  // Combine — take the geometric mean so no single factor dominates
  const probability = Math.pow(tier * sentiment_ * action_ * speedFactor, 0.25);
  return Math.min(0.98, Math.max(0.1, probability));
}

/**
 * Calculate a composite risk score (0-100) for an action.
 * Factors: order value, sentiment, confidence, automation safety, SLA status.
 */
function calculateRiskScore(
  order: Order | undefined,
  sentiment: string | undefined,
  confidence: number | undefined,
  automationSafe: boolean | undefined,
  action: string
): { score: number; level: "low" | "medium" | "high" | "critical"; factors: string[] } {
  let score = 10;
  const factors: string[] = [];

  // Order value risk
  const totalCents = order?.totalCents ?? 0;
  if (totalCents >= 50000) {
    score += 30;
    factors.push(`High-value order ($${(totalCents / 100).toFixed(2)} ≥ $500)`);
  } else if (totalCents >= 25000) {
    score += 15;
    factors.push(`Medium-value order ($${(totalCents / 100).toFixed(2)})`);
  }

  // Sentiment risk
  if (sentiment === "furious") {
    score += 25;
    factors.push("Furious sentiment — chargeback risk");
  } else if (sentiment === "frustrated") {
    score += 12;
    factors.push("Frustrated sentiment — churn risk");
  }

  // Confidence risk
  if (confidence != null && confidence < 0.7) {
    score += 15;
    factors.push(`Low AI confidence (${(confidence * 100).toFixed(0)}%)`);
  }

  // Automation safety
  if (automationSafe === false) {
    score += 20;
    factors.push("AI flagged as not safe for automation");
  }

  // Action-specific risk
  if (action === "refund" && totalCents >= 50000) {
    score += 10;
    factors.push("Large refund requires manager approval");
  }
  if (action === "cancel") {
    score += 8;
    factors.push("Cancellation has revenue impact");
  }

  score = Math.min(100, Math.max(0, score));
  const level: "low" | "medium" | "high" | "critical" =
    score >= 70 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return { score, level, factors };
}

/**
 * Simulate the business impact of a resolution action before it's executed.
 * Returns refund cost, retention impact, SLA status, risk score, and alternatives.
 */
export async function simulateBusinessImpact(
  caseRecord: CaseRecord,
  customer: Customer,
  order: Order | undefined,
  plan: ResolutionPlan | undefined,
  primaryAction: string
): Promise<BusinessImpactSimulation> {
  const actionLabels: Record<string, string> = {
    refund: "Issue Full Refund",
    replacement: "Dispatch Replacement",
    cancel: "Cancel Order",
    address_update: "Update Shipping Address",
    issue_credit: "Issue Store Credit",
    send_response: "Send Response Only",
    schedule_callback: "Schedule Callback",
    escalate: "Escalate to Human",
  };

  const actionLabel = actionLabels[primaryAction] ?? primaryAction;
  const refundCostCents = primaryAction === "refund"
    ? (order?.totalCents ?? 0)
    : primaryAction === "cancel"
    ? (order?.totalCents ?? 0)
    : primaryAction === "issue_credit"
    ? 1000
    : 0;

  const customerLTV = Math.round(customer.lifetimeValue * 100);
  const resolutionMins = plan?.estimatedResolutionMins ?? 5;
  const retentionProb = estimateRetentionProbability(
    customer,
    caseRecord.sentiment,
    primaryAction,
    resolutionMins
  );
  const retentionImpactCents = Math.round(customerLTV * (1 - retentionProb));

  // SLA impact
  const slaDeadline = caseRecord.slaDueAt ?? new Date(Date.now() + 4 * 3600_000).toISOString();
  const slaMs = new Date(slaDeadline).getTime() - Date.now();
  const slaMins = slaMs / 60000;
  const meetsSLA = resolutionMins <= slaMins;
  const slaStatus: "on_track" | "at_risk" | "breached" =
    slaMins < 0 ? "breached" : resolutionMins > slaMins * 0.8 ? "at_risk" : "on_track";

  // Risk
  const { score: riskScore, level: riskLevel, factors: riskFactors } = calculateRiskScore(
    order,
    caseRecord.sentiment,
    caseRecord.confidence,
    caseRecord.automationSafe,
    primaryAction
  );

  // Net business impact = refund cost + retention impact (negative = bad)
  const netImpactCents = refundCostCents + retentionImpactCents;

  // Recommendation
  let recommendation: "approve" | "review" | "reject" = "approve";
  let recommendationReason = "Low risk, positive retention outlook.";
  if (riskScore >= 70) {
    recommendation = "reject";
    recommendationReason = "Critical risk — requires manager approval before execution.";
  } else if (riskScore >= 50 || !caseRecord.automationSafe) {
    recommendation = "review";
    recommendationReason = "Elevated risk — human review recommended before execution.";
  }

  // Build alternatives for all relevant actions
  const allActions = ["refund", "replacement", "issue_credit", "escalate"];
  const alternatives = allActions
    .filter((a) => a !== primaryAction)
    .map((altAction) => {
      const altRefundCost =
        altAction === "refund" ? (order?.totalCents ?? 0) :
        altAction === "issue_credit" ? 1000 : 0;
      const altRetention = estimateRetentionProbability(
        customer,
        caseRecord.sentiment,
        altAction,
        altAction === "escalate" ? 480 : resolutionMins
      );
      const altRetentionImpact = Math.round(customerLTV * (1 - altRetention));
      const { score: altRisk } = calculateRiskScore(
        order,
        caseRecord.sentiment,
        caseRecord.confidence,
        caseRecord.automationSafe,
        altAction
      );
      const altNet = altRefundCost + altRetentionImpact;
      let altRec: "approve" | "review" | "reject" = "approve";
      if (altRisk >= 70) altRec = "reject";
      else if (altRisk >= 50) altRec = "review";
      return {
        action: altAction,
        actionLabel: actionLabels[altAction] ?? altAction,
        refundCostCents: altRefundCost,
        retentionProbability: altRetention,
        riskScore: altRisk,
        netBusinessImpactCents: altNet,
        recommendation: altRec,
      };
    });

  logger.info("business_impact_simulated", {
    caseId: caseRecord.id,
    action: primaryAction,
    refundCostCents,
    riskScore,
    recommendation,
  });

  return {
    action: primaryAction,
    actionLabel,
    refundCostCents,
    refundCostFormatted: formatCents(refundCostCents),
    customerLTV,
    customerLTVFormatted: formatCents(customerLTV),
    retentionProbability: retentionProb,
    retentionProbabilityPct: `${(retentionProb * 100).toFixed(0)}%`,
    retentionImpactCents,
    retentionImpactFormatted: formatCents(retentionImpactCents),
    slaImpact: {
      meetsSLA,
      estimatedResolutionMins: resolutionMins,
      slaDeadline,
      slaStatus,
    },
    riskScore,
    riskLevel,
    riskFactors,
    netBusinessImpactCents: netImpactCents,
    netBusinessImpactFormatted: formatCents(netImpactCents),
    recommendation,
    recommendationReason,
    alternatives,
  };
}
