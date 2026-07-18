import { callLLMJSON } from "./llm";
import { resolutionPlanSchema, type ResolutionPlanOutput } from "./schema";
import type {
  AIClassification,
  Customer,
  Order,
  Policy,
  RetrievalHit,
  ResolutionPlan,
  WorkflowStep,
  Intent,
} from "@/types";

const SYSTEM_PROMPT = `You are the resolution planner for an e-commerce customer care copilot.
Given a classified case, retrieved context, and applicable policies, you produce a structured resolution plan as strict JSON.

Rules:
- Always prefer the lowest-friction path that satisfies the customer.
- Each workflow step has an action verb: "refund" | "replacement" | "cancel" | "address_update" | "issue_credit" | "send_response" | "schedule_callback" | "escalate".
- safeToAuto=true ONLY for actions under $100, with no high-value dispute, and not requiring manager approval.
- If automationSafe is false, the FIRST step should be action="escalate".
- estimatedResolutionMins is realistic: ~3 for auto, ~480 if escalation required.
- customerImpact: one sentence describing what the customer experiences.
- risksIdentified: 0-3 short risk strings (e.g. "Order above $500 — manager approval required").

Output ONLY JSON, no prose, no fences. Schema:
{
  "goal": "...",
  "approach": "...",
  "workflowSteps": [
    { "id": "s1", "label": "...", "description": "...", "action": "...", "status": "pending", "safeToAuto": true }
  ],
  "estimatedResolutionMins": 3,
  "customerImpact": "...",
  "risksIdentified": ["..."]
}`;

// Deterministic fallback planner used when LLM is unavailable
export function fallbackPlan(
  classification: AIClassification,
  customer: Customer,
  order: Order | undefined,
  policies: Policy[]
): ResolutionPlan {
  const steps: WorkflowStep[] = [];
  const risks: string[] = [];

  if (!classification.automationSafe) {
    steps.push({
      id: "s1",
      label: "Escalate to senior agent",
      description: "Forward case to human queue with AI summary attached.",
      action: "escalate",
      status: "pending",
      safeToAuto: true, // Escalation is always safe to execute — it IS the safe action
    });
    risks.push("Manual review required before any financial action.");
    return {
      goal: "Safe handoff to a human agent with full context.",
      approach: "Escalate immediately — case is not safe to auto-resolve.",
      workflowSteps: steps,
      estimatedResolutionMins: 480,
      customerImpact:
        "Customer will receive a personal response from a senior agent within 8 business hours.",
      risksIdentified: risks,
    };
  }

  const intent = classification.intent;
  const totalCents = order?.totalCents ?? 0;

  if (intent === "refund_request") {
    if (totalCents <= 2500) {
      steps.push({
        id: "s1",
        label: "Issue full refund",
        description: `Refund $${(totalCents / 100).toFixed(2)} to original payment method (auto-eligible under REFUND-LOWVAL).`,
        action: "refund",
        status: "pending",
        safeToAuto: true,
      });
    } else {
      steps.push({
        id: "s1",
        label: "Issue full refund",
        description: `Refund $${(totalCents / 100).toFixed(2)} per REFUND-30 policy.`,
        action: "refund",
        status: "pending",
        safeToAuto: totalCents < 50000,
      });
    }
    steps.push({
      id: "s2",
      label: "Send confirmation",
      description: "Notify customer that refund has been processed and provide timeline.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  } else if (intent === "damaged_item" || intent === "wrong_product") {
    steps.push({
      id: "s1",
      label: "Issue replacement",
      description: `Dispatch replacement for ${order?.orderNumber ?? "the order"} at no cost.`,
      action: "replacement",
      status: "pending",
      safeToAuto: true,
    });
    steps.push({
      id: "s2",
      label: "Issue prepaid return label",
      description: "Send a prepaid return label for the damaged/wrong item.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
    steps.push({
      id: "s3",
      label: "Send apology + confirmation",
      description: "Apologize for the inconvenience and confirm the replacement has shipped.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  } else if (intent === "cancellation_request") {
    if (order?.status === "placed") {
      steps.push({
        id: "s1",
        label: "Cancel order",
        description: `Cancel ${order?.orderNumber ?? "order"} before shipment and issue full refund.`,
        action: "cancel",
        status: "pending",
        safeToAuto: true,
      });
      steps.push({
        id: "s2",
        label: "Send cancellation confirmation",
        description: "Confirm cancellation and refund timeline to the customer.",
        action: "send_response",
        status: "pending",
        safeToAuto: true,
      });
    } else {
      steps.push({
        id: "s1",
        label: "Escalate — order already shipped",
        description: "Order has shipped; cancellation requires return-on-delivery workflow.",
        action: "escalate",
        status: "pending",
        safeToAuto: false,
      });
      risks.push("Order already shipped — manual return processing required.");
    }
  } else if (intent === "address_correction") {
    if (order?.status === "placed") {
      steps.push({
        id: "s1",
        label: "Update shipping address",
        description: `Update address for ${order?.orderNumber ?? "order"} before carrier pickup.`,
        action: "address_update",
        status: "pending",
        safeToAuto: true,
      });
      steps.push({
        id: "s2",
        label: "Confirm new address",
        description: "Send confirmation of the updated shipping address to the customer.",
        action: "send_response",
        status: "pending",
        safeToAuto: true,
      });
    } else {
      steps.push({
        id: "s1",
        label: "Escalate — order in transit",
        description: "Order has shipped; address change must be requested with the carrier.",
        action: "escalate",
        status: "pending",
        safeToAuto: false,
      });
    }
  } else if (intent === "order_delay") {
    steps.push({
      id: "s1",
      label: "Issue $10 store credit",
      description: "Per SHIP-DELAY-3D policy, issue $10 store credit for the delay.",
      action: "issue_credit",
      status: "pending",
      safeToAuto: true,
    });
    steps.push({
      id: "s2",
      label: "Send status update",
      description: "Provide updated ETA and apology to the customer.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  } else if (intent === "return_eligibility") {
    steps.push({
      id: "s1",
      label: "Send return policy summary",
      description: "Confirm 90-day return window and send instructions to initiate return.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  } else if (intent === "replacement_request") {
    steps.push({
      id: "s1",
      label: "Dispatch replacement",
      description: `Issue replacement for ${order?.orderNumber ?? "order"}.`,
      action: "replacement",
      status: "pending",
      safeToAuto: true,
    });
    steps.push({
      id: "s2",
      label: "Send confirmation",
      description: "Confirm replacement has shipped with tracking.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  } else {
    steps.push({
      id: "s1",
      label: "Send general response",
      description: "Respond to the inquiry with relevant FAQ content.",
      action: "send_response",
      status: "pending",
      safeToAuto: true,
    });
  }

  if (totalCents >= 50000) {
    risks.push("Order above $500 — manager approval required before financial action.");
  }

  return {
    goal: `Resolve ${intent.replace(/_/g, " ")} for ${customer.name}.`,
    approach:
      "Execute safe automated workflow steps in sequence, with full audit trail and customer notification.",
    workflowSteps: steps,
    estimatedResolutionMins: 3,
    customerImpact:
      "Customer receives resolution within minutes with no manual agent involvement.",
    risksIdentified: risks,
  };
}

export async function planResolution(
  classification: AIClassification,
  customer: Customer,
  order: Order | undefined,
  policies: Policy[],
  retrievalHits: RetrievalHit[]
): Promise<ResolutionPlan> {
  const policySummary = policies
    .slice(0, 4)
    .map((p) => `- ${p.code}: ${p.title} — ${p.description.slice(0, 100)}`)
    .join("\n");
  const retrievalSummary = retrievalHits
    .map((h) => `- [${h.source}] ${h.title} (relevance ${h.relevance.toFixed(2)})`)
    .join("\n");

  const userPrompt = `Classification:
${JSON.stringify(classification, null, 2)}

Customer:
${JSON.stringify({ name: customer.name, tier: customer.tier, ltv: customer.lifetimeValue, orderCount: customer.orderCount })}

Order:
${order ? JSON.stringify({ orderNumber: order.orderNumber, status: order.status, totalCents: order.totalCents, items: order.items.map((i) => i.name) }) : "none"}

Applicable policies:
${policySummary || "none"}

Retrieved context:
${retrievalSummary || "none"}

Return the JSON resolution plan now.`;

  try {
    const raw = await callLLMJSON<ResolutionPlanOutput>(SYSTEM_PROMPT, userPrompt, {
      temperature: 0.25,
      maxTokens: 1100,
    });
    const parsed = resolutionPlanSchema.safeParse(raw);
    if (!parsed.success) {
      return fallbackPlan(classification, customer, order, policies);
    }
    const d = parsed.data;
    // Guardrail: if not automationSafe, force escalation as first step
    let steps = d.workflowSteps;
    if (!classification.automationSafe) {
      const escalateStep: WorkflowStep = {
        id: "s0",
        label: "Escalate to senior agent",
        description: "Forward case to human queue with AI summary attached.",
        action: "escalate",
        status: "pending",
        safeToAuto: true, // Escalation is always safe to execute
      };
      steps = [escalateStep, ...steps.filter((s) => s.action !== "escalate")];
    }
    // Guardrail: high-value orders require human approval for refunds
    if (order && order.totalCents >= 50000) {
      steps = steps.map((s) =>
        s.action === "refund" || s.action === "issue_credit" ? { ...s, safeToAuto: false } : s
      );
    }
    return {
      goal: d.goal,
      approach: d.approach,
      workflowSteps: steps as WorkflowStep[],
      estimatedResolutionMins: d.estimatedResolutionMins,
      customerImpact: d.customerImpact,
      risksIdentified: d.risksIdentified,
    };
  } catch (err) {
    console.error("[planner] LLM call failed, using fallback:", err);
    return fallbackPlan(classification, customer, order, policies);
  }
}
