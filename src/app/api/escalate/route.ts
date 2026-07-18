import { NextRequest, NextResponse } from "next/server";
import {
  getCaseById,
  getCustomerById,
  updateCase,
  appendAudit,
  bumpMetric,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { buildEscalationSummary } from "@/lib/workflow/escalation";
import { escalateSchema } from "@/lib/validation/apiSchemas";
import type { AIClassification } from "@/types";

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
  const parsed = escalateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "caseId required", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { caseId, reason, agentName } = parsed.data;

  const c = await getCaseById(caseId);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const escalationReason = reason ?? c.escalationReason ?? "Manual escalation requested by agent.";
  const classification: AIClassification = {
    intent: c.intent ?? "general_inquiry",
    sentiment: c.sentiment ?? "neutral",
    sentimentScore: c.sentimentScore ?? 0,
    urgency: c.urgency ?? "medium",
    confidence: c.confidence ?? 0.5,
    automationSafe: false,
    neededContext: [],
    explanation: "",
    keywords: [],
  };
  const summary = buildEscalationSummary(c, customer.name, classification);

  const updated = await updateCase(c.id, {
    status: "escalated",
    escalationReason,
    assignedAgentId: user.id,
  });

  await bumpMetric("escalated", 1);
  await bumpMetric("open", -1);

  await appendAudit({
    caseId: c.id,
    customerId: c.customerId,
    actorId: user.id,
    actorType: "system",
    action: "case.escalate",
    category: "escalation",
    detail: `Case escalated to human queue by ${agentName ?? user.name}. Reason: ${escalationReason}. Priority: ${summary.priority}.`,
    metadata: { summary },
  });

  return NextResponse.json({ case: updated, summary });
}
