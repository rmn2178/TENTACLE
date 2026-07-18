import { callLLMJSON } from "./llm";
import type {
  AIClassification,
  Customer,
  Order,
  ResolutionPlan,
} from "@/types";

const SYSTEM_PROMPT = `You are the customer-facing response drafter for an e-commerce brand named "Marigold & Co".
You write the reply that will be sent to the customer after the resolution plan has been executed.

Tone rules:
- Warm but professional. Never robotic, never over-apologetic.
- Use the customer's first name once in the greeting.
- Reference the specific order number and concrete resolution steps.
- Keep it under 130 words.
- Sign as "The Marigold & Co Care Team".
- Never promise anything not in the plan. Never invent tracking numbers or dates.
- Do NOT use markdown formatting — plain text with line breaks only.

Output ONLY a JSON object: { "response": "..." }`;

export function fallbackResponse(
  classification: AIClassification,
  customer: Customer,
  order: Order | undefined,
  plan: ResolutionPlan
): string {
  const first = customer.name.split(" ")[0];
  const orderRef = order ? ` for order ${order.orderNumber}` : "";
  const executedSteps = plan.workflowSteps.filter((s) => s.status === "executed");
  const action = executedSteps[0]?.label ?? plan.workflowSteps[0]?.label ?? "your request";

  return `Hi ${first},

Thanks for reaching out. We've reviewed your message and ${action.toLowerCase()}${orderRef}.

${plan.customerImpact}

If there's anything else we can do, just reply to this message and we'll take care of it right away.

The Marigold & Co Care Team`;
}

export async function draftResponse(
  classification: AIClassification,
  customer: Customer,
  order: Order | undefined,
  plan: ResolutionPlan
): Promise<string> {
  const userPrompt = `Classification:
${JSON.stringify({ intent: classification.intent, sentiment: classification.sentiment, urgency: classification.urgency })}

Customer first name: ${customer.name.split(" ")[0]}
Order: ${order ? order.orderNumber : "n/a"}
Plan goal: ${plan.goal}
Executed steps:
${plan.workflowSteps.map((s) => `- ${s.label}: ${s.description}`).join("\n")}

Draft the customer-facing reply now. Return JSON: { "response": "..." }`;

  try {
    const out = await callLLMJSON<{ response: string }>(SYSTEM_PROMPT, userPrompt, {
      temperature: 0.4,
      maxTokens: 400,
    });
    if (out?.response && typeof out.response === "string" && out.response.trim().length > 20) {
      return out.response.trim();
    }
    return fallbackResponse(classification, customer, order, plan);
  } catch (err) {
    console.error("[responder] LLM call failed, using fallback:", err);
    return fallbackResponse(classification, customer, order, plan);
  }
}
