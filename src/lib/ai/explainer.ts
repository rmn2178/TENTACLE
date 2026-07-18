import "server-only";
import type { CaseRecord, Customer, Order, Policy, RetrievalHit, ResolutionPlan } from "@/types";
import type { RuleEvaluation } from "@/lib/workflow/rules";
import type { LearningSignal } from "@/types/learning";
import type { DecisionExplanation } from "@/types/explanation";
import { intentLabel, sentimentColor, urgencyColor } from "@/lib/utils/format";

/**
 * Generate a full decision explanation for a case — the "Why this action?" panel.
 *
 * Combines:
 * - Top signals (keywords from message, customer tier, order status, policy matches)
 * - Policy matches with pass/fail reasons
 * - Confidence breakdown (intent, sentiment, urgency contributions)
 * - Safety analysis (why safe or unsafe, which guardrails triggered)
 * - Escalation analysis (if applicable)
 * - Learning signals (how past overrides affect this decision)
 */
export function explainDecision(
  caseRecord: CaseRecord,
  customer: Customer,
  order: Order | undefined,
  policies: Policy[],
  retrievalHits: RetrievalHit[],
  ruleResults: RuleEvaluation[],
  plan: ResolutionPlan | undefined,
  learningSignal: LearningSignal
): DecisionExplanation {
  // ── Top signals ────────────────────────────────────────────────────────────
  const topSignals: DecisionExplanation["topSignals"] = [];

  // Message keywords
  if (caseRecord.intent) {
    const keywordMap: Record<string, string[]> = {
      order_delay: ["delay", "late", "hasn't arrived", "tracking"],
      damaged_item: ["damaged", "broken", "shattered", "dented"],
      wrong_product: ["wrong", "incorrect", "different color"],
      refund_request: ["refund", "money back", "return"],
      replacement_request: ["replace", "replacement", "send another"],
      cancellation_request: ["cancel", "cancellation"],
      address_correction: ["address", "wrong address", "old address"],
      return_eligibility: ["return", "returnable", "return window"],
    };
    const keywords = keywordMap[caseRecord.intent] ?? [];
    const messageLower = caseRecord.message.toLowerCase();
    const matched = keywords.filter((k) => messageLower.includes(k));
    if (matched.length > 0) {
      topSignals.push({
        signal: `Message keywords: ${matched.join(", ")}`,
        weight: 0.35,
        source: "message",
        detail: `Detected ${matched.length} keyword(s) matching the "${intentLabel(caseRecord.intent)}" intent.`,
      });
    }
  }

  // Customer tier signal
  const tierWeight: Record<string, number> = { platinum: 0.20, gold: 0.15, silver: 0.10, standard: 0.05 };
  topSignals.push({
    signal: `Customer tier: ${customer.tier}`,
    weight: tierWeight[customer.tier] ?? 0.05,
    source: "customer",
    detail: `${customer.tier} tier customer with LTV $${customer.lifetimeValue.toFixed(2)} and ${customer.orderCount} orders — ${customer.tier === "platinum" || customer.tier === "gold" ? "high-value, prioritize retention" : "standard priority"}.`,
  });

  // Order status signal
  if (order) {
    topSignals.push({
      signal: `Order status: ${order.status}`,
      weight: 0.20,
      source: "order",
      detail: `Order ${order.orderNumber} is currently "${order.status}" with ${order.items.length} item(s) totaling $${(order.totalCents / 100).toFixed(2)}.`,
    });
  }

  // Sentiment signal
  if (caseRecord.sentiment) {
    const sentimentWeight: Record<string, number> = {
      positive: 0.05,
      neutral: 0.10,
      negative: 0.15,
      frustrated: 0.20,
      furious: 0.25,
    };
    topSignals.push({
      signal: `Sentiment: ${sentimentColor(caseRecord.sentiment).label} (score ${caseRecord.sentimentScore?.toFixed(2) ?? "n/a"})`,
      weight: sentimentWeight[caseRecord.sentiment] ?? 0.10,
      source: "message",
      detail: caseRecord.sentiment === "furious"
        ? "Furious sentiment detected — chargeback/legal threat keywords present. Auto-escalation triggered."
        : caseRecord.sentiment === "frustrated"
        ? "Frustrated sentiment — customer is unhappy but constructive."
        : `Sentiment is ${caseRecord.sentiment}.`,
    });
  }

  // Learning signal
  if (learningSignal.similarOverrides > 0) {
    topSignals.push({
      signal: `${learningSignal.similarOverrides} past override(s) on similar cases`,
      weight: 0.15,
      source: "history",
      detail: learningSignal.note,
    });
  }

  topSignals.sort((a, b) => b.weight - a.weight);

  // ── Policy matches ──────────────────────────────────────────────────────────
  const policyMatches: DecisionExplanation["policyMatches"] = ruleResults.map((r) => {
    const hit = retrievalHits.find((h) => h.title.includes(r.policy.code));
    return {
      code: r.policy.code,
      title: r.policy.title,
      snippet: r.policy.description.slice(0, 150) + (r.policy.description.length > 150 ? "…" : ""),
      relevance: hit?.relevance ?? 0.5,
      passed: r.passed,
      reason: r.reason,
    };
  });

  // ── Confidence breakdown ────────────────────────────────────────────────────
  const confidence = caseRecord.confidence ?? 0.5;
  const intentConfidence = Math.min(1, confidence + 0.1);
  const sentimentConfidence = Math.max(0.3, confidence - 0.05);
  const urgencyConfidence = Math.max(0.4, confidence - 0.10);

  const confidenceFactors: Array<{ factor: string; contribution: number; detail: string }> = [];
  confidenceFactors.push({
    factor: "Intent detection",
    contribution: 0.40,
    detail: caseRecord.intent
      ? `LLM classified as "${intentLabel(caseRecord.intent)}" with keyword confirmation.`
      : "Intent not yet classified.",
  });
  confidenceFactors.push({
    factor: "Sentiment analysis",
    contribution: 0.25,
    detail: caseRecord.sentiment
      ? `Sentiment "${sentimentColor(caseRecord.sentiment).label}" with score ${caseRecord.sentimentScore?.toFixed(2)}.`
      : "Sentiment not yet analyzed.",
  });
  confidenceFactors.push({
    factor: "Urgency assessment",
    contribution: 0.20,
    detail: caseRecord.urgency
      ? `Urgency set to "${urgencyColor(caseRecord.urgency).label}" based on sentiment and deadline keywords.`
      : "Urgency not yet assessed.",
  });
  confidenceFactors.push({
    factor: "Context retrieval",
    contribution: 0.15,
    detail: retrievalHits.length > 0
      ? `${retrievalHits.length} context items retrieved (policies, customer history, order, similar cases).`
      : "No context retrieved yet.",
  });

  if (learningSignal.similarOverrides > 0) {
    confidenceFactors.push({
      factor: "Learning adjustment",
      contribution: learningSignal.confidenceDelta,
      detail: learningSignal.note,
    });
  }

  // ── Safety analysis ─────────────────────────────────────────────────────────
  const safetyReasons: string[] = [];
  const guardrails: string[] = [];

  if (caseRecord.automationSafe === true) {
    safetyReasons.push("Intent is unambiguous and confidence is above threshold.");
    safetyReasons.push("No furious sentiment detected.");
    safetyReasons.push("Order value is below the $500 manager-approval threshold.");
    guardrails.push("automationSafe = true (LLM + heuristic consensus)");
  } else if (caseRecord.automationSafe === false) {
    if (caseRecord.sentiment === "furious") {
      safetyReasons.push("Furious sentiment detected — chargeback/legal risk.");
      guardrails.push("Guardrail: furious sentiment → force automationSafe = false");
    }
    if (order && order.totalCents >= 50000) {
      safetyReasons.push(`Order value $${(order.totalCents / 100).toFixed(2)} exceeds $500 threshold.`);
      guardrails.push("Guardrail: order ≥ $500 → force automationSafe = false");
    }
    if (caseRecord.confidence != null && caseRecord.confidence < 0.7) {
      safetyReasons.push(`Low confidence (${(caseRecord.confidence * 100).toFixed(0)}%) — uncertain classification.`);
      guardrails.push("Guardrail: confidence < 70% → force automationSafe = false");
    }
    if (learningSignal.overrideRate > 0.4) {
      safetyReasons.push(`High override rate (${Math.round(learningSignal.overrideRate * 100)}%) on similar cases — organizational learning suggests caution.`);
      guardrails.push("Guardrail: override rate > 40% → reduce automationSafe");
    }
  }

  // ── Escalation analysis ─────────────────────────────────────────────────────
  let escalationAnalysis: DecisionExplanation["escalationAnalysis"];
  if (caseRecord.status === "escalated" || caseRecord.escalationReason) {
    let triggeredBy = "";
    if (caseRecord.sentiment === "furious") triggeredBy = "Furious sentiment guardrail";
    else if (order && order.totalCents >= 50000) triggeredBy = "High-value order guardrail";
    else if (!caseRecord.automationSafe) triggeredBy = "Automation safety flag";
    else triggeredBy = "Manual escalation by agent";

    escalationAnalysis = {
      triggered: true,
      reason: caseRecord.escalationReason ?? "Case requires human review.",
      triggeredBy,
      recommendedAction: plan?.workflowSteps.find((s) => !s.safeToAuto)?.label ?? "Review case and decide on appropriate action.",
    };
  }

  return {
    topSignals: topSignals.slice(0, 6),
    policyMatches,
    confidenceBreakdown: {
      intentConfidence,
      sentimentConfidence,
      urgencyConfidence,
      overall: confidence,
      factors: confidenceFactors,
    },
    safetyAnalysis: {
      isSafe: caseRecord.automationSafe ?? false,
      reasons: safetyReasons.length > 0 ? safetyReasons : ["Case not yet classified — safety analysis pending."],
      guardrails: guardrails.length > 0 ? guardrails : ["No guardrails triggered yet."],
    },
    escalationAnalysis,
    learningSignals: {
      similarOverrides: learningSignal.similarOverrides,
      overrideRate: learningSignal.overrideRate,
      confidenceDelta: learningSignal.confidenceDelta,
      adjustedConfidence: Math.max(0, Math.min(1, confidence + learningSignal.confidenceDelta)),
      note: learningSignal.note,
    },
  };
}
