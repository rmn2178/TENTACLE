import { callLLMJSON } from "./llm";
import { classificationSchema, type ClassificationOutput } from "./schema";
import type { Intent, Sentiment, Urgency, AIClassification } from "@/types";

const SYSTEM_PROMPT = `You are the classification engine for an e-commerce customer care copilot.
You analyze a single inbound customer message and produce a strict JSON classification.

Rules:
- Read the message carefully and infer the customer's primary intent.
- Sentiment scale: positive | neutral | negative | frustrated | furious.
  * "frustrated" = annoyed but constructive. "furious" = threats of chargeback, legal action, profanity, or repeated anger.
- sentimentScore is a float in [-1, 1] consistent with sentiment.
- Urgency: low | medium | high | critical.
  * "critical" = travel/event deadline today/tomorrow, chargeback threat, or repeat complaint.
- confidence is in [0, 1] — your confidence in the classification as a whole.
- automationSafe = true ONLY when (a) intent is unambiguous, (b) sentiment is not furious, and (c) no high-value dispute signal.
- neededContext lists what additional data the next stage should retrieve (e.g. "order record", "refund policy", "customer history").
- keywords: up to 6 most relevant tokens/phrases from the message.
- explanation: ONE sentence (max 25 words) explaining the classification.

Output ONLY a JSON object — no prose, no markdown, no code fences. The schema is:
{
  "intent": "...",
  "sentiment": "...",
  "sentimentScore": 0.0,
  "urgency": "...",
  "confidence": 0.0,
  "automationSafe": true,
  "neededContext": ["..."],
  "explanation": "...",
  "keywords": ["..."]
}`;

// Lightweight rule-based fallback classifier used when LLM is unavailable
export function fallbackClassify(message: string, subject?: string): AIClassification {
  const text = `${subject ?? ""} ${message}`.toLowerCase();
  const has = (k: string[]) => k.some((w) => text.includes(w));

  let intent: Intent = "general_inquiry";
  if (has(["delay", "late", "hasn't arrived", "still not here", "where is"])) intent = "order_delay";
  else if (has(["damaged", "broken", "shattered", "dented", "cracked", "torn"])) intent = "damaged_item";
  else if (has(["wrong", "incorrect", "not what i ordered", "different color"])) intent = "wrong_product";
  else if (has(["refund", "money back"])) intent = "refund_request";
  else if (has(["replace", "replacement", "send another"])) intent = "replacement_request";
  else if (has(["cancel", "cancellation"])) intent = "cancellation_request";
  else if (has(["address", "wrong address", "old address"])) intent = "address_correction";
  else if (has(["return", "returnable", "return window"])) intent = "return_eligibility";

  let sentiment: Sentiment = "neutral";
  let score = 0.05;
  if (has(["furious", "unacceptable", "chargeback", "lawsuit", "never shopping"])) {
    sentiment = "furious";
    score = -0.9;
  } else if (has(["angry", "ridiculous", "joke", "disappointed", "frustrated", "ruined"])) {
    sentiment = "frustrated";
    score = -0.6;
  } else if (has(["upset", "annoyed", "not happy", "poor"])) {
    sentiment = "negative";
    score = -0.35;
  } else if (has(["thank", "love", "great", "appreciate"])) {
    sentiment = "positive";
    score = 0.6;
  }

  let urgency: Urgency = "medium";
  if (intent === "damaged_item" || has(["weekend", "tomorrow", "guests", "deadline"])) urgency = "high";
  if (sentiment === "furious") urgency = "critical";

  const automationSafe =
    sentiment !== "furious" &&
    intent !== "general_inquiry";

  const keywords = text
    .split(/\s+/)
    .filter((w) => w.length > 4 && !["order", "please", "thanks", "thank"].includes(w))
    .slice(0, 6);

  return {
    intent,
    sentiment,
    sentimentScore: score,
    urgency,
    confidence: 0.62,
    automationSafe,
    neededContext:
      intent === "general_inquiry"
        ? ["faq"]
        : ["order record", "applicable policy", "customer history"],
    explanation: `Heuristic classification: ${intent} with ${sentiment} sentiment.`,
    keywords,
  };
}

export async function classifyMessage(
  message: string,
  subject?: string,
  context?: { orderTotalCents?: number; customerTier?: string }
): Promise<AIClassification> {
  const userPrompt = `Subject: ${subject ?? "(none)"}
Message:
"""
${message}
"""
${context?.orderTotalCents ? `Order total: $${(context.orderTotalCents / 100).toFixed(2)}` : ""}
${context?.customerTier ? `Customer tier: ${context.customerTier}` : ""}

Return the JSON classification now.`;

  try {
    const raw = await callLLMJSON<ClassificationOutput>(
      SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.15, maxTokens: 800 }
    );
    const parsed = classificationSchema.safeParse(raw);
    if (!parsed.success) {
      // Try to coerce
      const fb = fallbackClassify(message, subject);
      return fb;
    }
    const d = parsed.data;
    // Apply deterministic guardrails on top of the model output
    let automationSafe = d.automationSafe;
    let urgency = d.urgency;
    if (d.sentiment === "furious") {
      automationSafe = false;
      urgency = "critical";
    }
    if (context?.orderTotalCents && context.orderTotalCents >= 50000) {
      automationSafe = false;
    }
    return {
      intent: d.intent,
      sentiment: d.sentiment,
      sentimentScore: d.sentimentScore,
      urgency,
      confidence: d.confidence,
      automationSafe,
      neededContext: d.neededContext,
      explanation: d.explanation,
      keywords: d.keywords,
    };
  } catch (err) {
    console.error("[classify] LLM call failed, using fallback:", err);
    return fallbackClassify(message, subject);
  }
}
