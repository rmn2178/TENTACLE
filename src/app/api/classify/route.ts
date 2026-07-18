import { NextRequest, NextResponse } from "next/server";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  updateCase,
  appendAudit,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { classifyMessage } from "@/lib/ai/classify";
import { canTransition } from "@/lib/workflow/stateMachine";
import { intentLabel } from "@/lib/utils/format";
import { caseIdSchema } from "@/lib/validation/apiSchemas";

export const runtime = "nodejs";

// Run classification on a case and update its state.
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

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = c.orderId ? await getOrderById(c.orderId) : undefined;

  const classification = await classifyMessage(c.message, c.subject, {
    orderTotalCents: order?.totalCents,
    customerTier: customer.tier,
  });

  const newStatus = canTransition(c.status, "classified") ? "classified" : c.status;
  const updated = await updateCase(c.id, {
    intent: classification.intent,
    sentiment: classification.sentiment,
    sentimentScore: classification.sentimentScore,
    urgency: classification.urgency,
    confidence: classification.confidence,
    automationSafe: classification.automationSafe,
    status: newStatus,
  });

  await appendAudit({
    caseId: c.id,
    customerId: c.customerId,
    actorId: user.id,
    actorType: "ai",
    action: "case.classify",
    category: "classification",
    detail: `Intent=${intentLabel(classification.intent)}, Sentiment=${classification.sentiment} (${classification.sentimentScore.toFixed(2)}), Urgency=${classification.urgency}, Confidence=${(classification.confidence * 100).toFixed(0)}%, AutomationSafe=${classification.automationSafe}`,
    metadata: { model: "gemini-classifier", ...classification },
  });

  return NextResponse.json({ case: updated, classification });
}
