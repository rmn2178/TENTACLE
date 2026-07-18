import type { AIClassification, Order, Customer, Policy } from "@/types";

export interface RuleEvaluation {
  policy: Policy;
  passed: boolean;
  reason: string;
}

// Intent → policy codes that should be evaluated for that intent
const INTENT_POLICY_MAP: Record<string, string[]> = {
  order_delay: ["SHIP-DELAY-3D", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  damaged_item: ["DAMAGE-FULL", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  wrong_product: ["WRONG-PRODUCT", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  refund_request: ["REFUND-30", "REFUND-LOWVAL", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  replacement_request: ["DAMAGE-FULL", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  cancellation_request: ["CANCEL-PRE-SHIP", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  address_correction: ["ADDR-PRE-SHIP", "ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
  return_eligibility: ["RETURN-ELIG-90", "ESCALATE-FURIOUS"],
  general_inquiry: ["ESCALATE-FURIOUS"],
  escalation: ["ESCALATE-FURIOUS", "ESCALATE-HV-CASE"],
};

/**
 * Get the policies applicable to a given intent. Pure function — accepts the
 * full policy list from the DB and filters by code.
 */
export function getApplicablePolicies(
  intent: AIClassification["intent"],
  allPolicies: Policy[]
): Policy[] {
  const codes = INTENT_POLICY_MAP[intent] ?? [];
  return allPolicies.filter((p) => codes.includes(p.code));
}

// Evaluate applicable policies against the case facts.
export function evaluateRules(
  classification: AIClassification,
  customer: Customer,
  order: Order | undefined,
  allPolicies: Policy[]
): RuleEvaluation[] {
  const out: RuleEvaluation[] = [];

  const daysSinceDelivery = order?.deliveredAt
    ? Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / 86400000)
    : null;
  const daysLate = order?.eta
    ? Math.max(0, Math.floor((Date.now() - new Date(order.eta).getTime()) / 86400000))
    : 0;

  for (const p of getApplicablePolicies(classification.intent, allPolicies)) {
    let passed = false;
    let reason = "";

    if (p.code === "REFUND-30") {
      passed = daysSinceDelivery !== null && daysSinceDelivery <= 30;
      reason =
        daysSinceDelivery === null
          ? "Order not yet delivered"
          : `${daysSinceDelivery} days since delivery (≤30 required)`;
    } else if (p.code === "REFUND-LOWVAL") {
      passed = (order?.totalCents ?? 0) <= 2500;
      reason = `Order total $${((order?.totalCents ?? 0) / 100).toFixed(2)} (≤$25 required)`;
    } else if (p.code === "RETURN-ELIG-90") {
      passed = daysSinceDelivery !== null && daysSinceDelivery <= 90;
      reason =
        daysSinceDelivery === null
          ? "Order not yet delivered"
          : `${daysSinceDelivery} days since delivery (≤90 required)`;
    } else if (p.code === "DAMAGE-FULL") {
      passed = classification.intent === "damaged_item";
      reason = passed ? "Damage reported — full replacement eligible" : "No damage signal";
    } else if (p.code === "WRONG-PRODUCT") {
      passed = classification.intent === "wrong_product";
      reason = passed ? "Wrong product reported" : "Not a wrong-product case";
    } else if (p.code === "CANCEL-PRE-SHIP") {
      passed = order?.status === "placed";
      reason = `Order status: ${order?.status ?? "n/a"} (placed required)`;
    } else if (p.code === "ADDR-PRE-SHIP") {
      passed = order?.status === "placed";
      reason = `Order status: ${order?.status ?? "n/a"} (placed required)`;
    } else if (p.code === "SHIP-DELAY-3D") {
      passed = daysLate >= 3;
      reason = `${daysLate} days late (≥3 required)`;
    } else if (p.code === "ESCALATE-HV-CASE") {
      passed = (order?.totalCents ?? 0) >= 50000;
      reason = `Order total $${((order?.totalCents ?? 0) / 100).toFixed(2)} (≥$500 triggers escalation)`;
    } else if (p.code === "ESCALATE-FURIOUS") {
      passed = classification.sentiment === "furious";
      reason = `Sentiment: ${classification.sentiment}`;
    } else {
      passed = p.autoResolve;
      reason = "Default applicable";
    }

    out.push({ policy: p, passed, reason });
  }

  // customer param is used for future LTV-based rules; reference to avoid unused warning
  void customer;

  return out;
}

export function shouldEscalate(
  classification: AIClassification,
  order: Order | undefined,
  ruleResults: RuleEvaluation[]
): { escalate: boolean; reason?: string } {
  if (classification.sentiment === "furious") {
    return { escalate: true, reason: "Furious sentiment — senior agent review required." };
  }
  if (order && order.totalCents >= 50000) {
    return { escalate: true, reason: "High-value order — manager approval required." };
  }
  if (!classification.automationSafe) {
    return { escalate: true, reason: "Case not safe for autonomous resolution." };
  }
  const escalationPolicy = ruleResults.find(
    (r) => r.policy.code.startsWith("ESCALATE") && r.passed
  );
  if (escalationPolicy) {
    return { escalate: true, reason: escalationPolicy.reason };
  }
  return { escalate: false };
}
