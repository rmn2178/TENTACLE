import type { RetrievalHit, Intent, Customer, Order, Policy, CaseRecord } from "@/types";

// Map intents to the policy categories we should retrieve
const INTENT_TO_CATEGORY: Record<Intent, string[]> = {
  order_delay: ["shipping", "general"],
  damaged_item: ["damaged", "general"],
  wrong_product: ["general", "return"],
  refund_request: ["refund", "return"],
  replacement_request: ["damaged", "return"],
  cancellation_request: ["cancellation"],
  address_correction: ["general"],
  return_eligibility: ["return"],
  general_inquiry: ["general"],
  escalation: ["general"],
};

/**
 * Retrieve relevant context (policies, customer history, order, similar cases).
 * Policies and similar cases are passed in by the caller (from the DB) so this
 * function remains pure and testable.
 */
export function retrieve(
  intent: Intent,
  customer: Customer,
  order: Order | undefined,
  policies: Policy[],
  similarCases: CaseRecord[] = []
): RetrievalHit[] {
  const hits: RetrievalHit[] = [];
  const cats = INTENT_TO_CATEGORY[intent] ?? ["general"];

  // 1. Policy retrieval — keyword + category match
  for (const p of policies) {
    let score = 0;
    if (cats.includes(p.category)) score += 0.55;
    if (intent === "refund_request" && p.code.startsWith("REFUND")) score += 0.25;
    if (intent === "damaged_item" && p.code === "DAMAGE-FULL") score += 0.3;
    if (intent === "wrong_product" && p.code === "WRONG-PRODUCT") score += 0.3;
    if (intent === "cancellation_request" && p.code === "CANCEL-PRE-SHIP") score += 0.3;
    if (intent === "address_correction" && p.code === "ADDR-PRE-SHIP") score += 0.3;
    if (intent === "order_delay" && p.code === "SHIP-DELAY-3D") score += 0.3;
    if (intent === "return_eligibility" && p.code === "RETURN-ELIG-90") score += 0.3;
    score += Math.min(p.weight, 10) * 0.01;
    if (score > 0.4) {
      hits.push({
        id: p.id,
        source: "policy",
        title: `${p.code} — ${p.title}`,
        snippet: p.description,
        relevance: Math.min(score, 0.98),
        meta: { category: p.category, autoResolve: String(p.autoResolve) },
      });
    }
  }

  // 2. Customer history
  hits.push({
    id: `cust_${customer.id}`,
    source: "customer_history",
    title: `${customer.name} — ${customer.tier} tier · ${customer.orderCount} orders · LTV $${customer.lifetimeValue.toFixed(0)}`,
    snippet: `Customer has placed ${customer.orderCount} order(s). Lifetime value $${customer.lifetimeValue.toFixed(2)}. Tier: ${customer.tier}.`,
    relevance: 0.85,
    meta: { tier: customer.tier, ltv: String(customer.lifetimeValue) },
  });

  // 3. Order context
  if (order) {
    const totalDays = order.placedAt
      ? Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 86400000)
      : 0;
    const etaDays = order.eta
      ? Math.floor((new Date(order.eta).getTime() - Date.now()) / 86400000)
      : null;
    hits.push({
      id: order.id,
      source: "order",
      title: `Order ${order.orderNumber} — ${order.status}`,
      snippet: `Status: ${order.status}. Placed ${totalDays}d ago. Items: ${order.items.map((i) => i.name).join(", ")}. ${etaDays !== null ? `ETA in ${etaDays}d.` : "No ETA on file."}`,
      relevance: 0.95,
      meta: {
        orderNumber: order.orderNumber,
        total: String(order.totalCents),
        status: order.status,
      },
    });
  }

  // 4. Similar historical case (passed in from DB)
  const similar = similarCases.find((c) => c.intent === intent && c.status === "resolved");
  if (similar) {
    hits.push({
      id: similar.id,
      source: "similar_case",
      title: `Similar resolved case — ${similar.caseNumber}`,
      snippet: similar.responseDraft ?? similar.message.slice(0, 140),
      relevance: 0.72,
      meta: { caseNumber: similar.caseNumber },
    });
  }

  return hits.sort((a, b) => b.relevance - a.relevance).slice(0, 6);
}
