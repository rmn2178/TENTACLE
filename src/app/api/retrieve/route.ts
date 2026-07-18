import { NextRequest, NextResponse } from "next/server";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  updateCase,
  appendAudit,
  getPolicies,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { retrieve } from "@/lib/ai/retrieve";
import { evaluateRules, getApplicablePolicies } from "@/lib/workflow/rules";
import { canTransition } from "@/lib/workflow/stateMachine";
import { caseIdSchema } from "@/lib/validation/apiSchemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = caseIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "caseId required", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { caseId } = parsed.data;

  const c = await getCaseById(caseId);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!c.intent) {
    return NextResponse.json({ error: "Case must be classified first" }, { status: 400 });
  }

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = c.orderId ? await getOrderById(c.orderId) : undefined;

  const allPolicies = await getPolicies();
  const hits = retrieve(c.intent, customer, order, allPolicies);
  const applicablePolicies = getApplicablePolicies(c.intent, allPolicies);
  const classification = {
    intent: c.intent,
    sentiment: c.sentiment ?? "neutral",
    sentimentScore: c.sentimentScore ?? 0,
    urgency: c.urgency ?? "medium",
    confidence: c.confidence ?? 0.5,
    automationSafe: c.automationSafe ?? true,
    neededContext: [],
    explanation: "",
    keywords: [],
  };
  const ruleResults = evaluateRules(classification, customer, order, applicablePolicies);

  const newStatus = canTransition(c.status, "retrieved") ? "retrieved" : c.status;
  const updated = await updateCase(c.id, {
    retrievalHits: hits,
    status: newStatus,
  });

  await appendAudit({
    caseId: c.id,
    customerId: c.customerId,
    actorId: user.id,
    actorType: "ai",
    action: "case.retrieve",
    category: "retrieval",
    detail: `Retrieved ${hits.length} context items: ${hits.map((h) => `[${h.source}] ${h.title}`).join("; ").slice(0, 200)}`,
    metadata: { hits, ruleResults },
  });

  return NextResponse.json({
    case: updated,
    hits,
    ruleResults,
    applicablePolicies,
  });
}
