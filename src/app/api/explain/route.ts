import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  getPolicies,
} from "@/lib/db/queries";
import { retrieve } from "@/lib/ai/retrieve";
import { evaluateRules, getApplicablePolicies, shouldEscalate } from "@/lib/workflow/rules";
import { explainDecision } from "@/lib/ai/explainer";
import { getLearningSignal } from "@/lib/ai/learning";
import { getCases } from "@/lib/db/queries";
import type { AIClassification } from "@/types";

export const runtime = "nodejs";

const schema = z.object({
  caseId: z.string().min(1),
});

// POST — generate the full decision explanation for a case
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { caseId } = parsed.data;
  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(caseRecord.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const order = caseRecord.orderId ? await getOrderById(caseRecord.orderId) : undefined;
  const allPolicies = await getPolicies();
  const allCases = await getCases();

  const classification: AIClassification = {
    intent: caseRecord.intent ?? "general_inquiry",
    sentiment: caseRecord.sentiment ?? "neutral",
    sentimentScore: caseRecord.sentimentScore ?? 0,
    urgency: caseRecord.urgency ?? "medium",
    confidence: caseRecord.confidence ?? 0.5,
    automationSafe: caseRecord.automationSafe ?? true,
    neededContext: [],
    explanation: "",
    keywords: [],
  };

  const retrievalHits = caseRecord.retrievalHits ?? retrieve(classification.intent, customer, order, allPolicies, allCases);
  const applicablePolicies = getApplicablePolicies(classification.intent, allPolicies);
  const ruleResults = evaluateRules(classification, customer, order, allPolicies);
  const learningSignal = await getLearningSignal(caseRecord.intent, caseRecord.sentiment, order?.totalCents);

  const explanation = explainDecision(
    caseRecord,
    customer,
    order,
    applicablePolicies,
    retrievalHits,
    ruleResults,
    caseRecord.resolutionPlan,
    learningSignal
  );

  return NextResponse.json({ explanation, learningSignal });
}
