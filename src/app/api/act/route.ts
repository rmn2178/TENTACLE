import { NextRequest, NextResponse } from "next/server";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  updateCase,
  appendAudit,
  bumpMetric,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { executePlan } from "@/lib/workflow/actions";
import { draftResponse } from "@/lib/ai/responder";
import { canTransition } from "@/lib/workflow/stateMachine";
import { caseIdSchema } from "@/lib/validation/apiSchemas";
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
  if (!c.resolutionPlan) {
    return NextResponse.json({ error: "Case must be planned first" }, { status: 400 });
  }

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = c.orderId ? await getOrderById(c.orderId) : undefined;

  const { steps, auditDetails, totalImpactCents } = executePlan(c, order);

  const hasPendingUnsafe = steps.some((s) => s.status === "pending" && !s.safeToAuto);
  const hasEscalateStep = steps.some((s) => s.action === "escalate" && s.status === "executed");

  let newStatus: typeof c.status = c.status;
  let resolvedAt: Date | undefined;
  if (canTransition(c.status, "acted")) newStatus = "acted";
  if (hasEscalateStep) {
    newStatus = "escalated";
  } else if (!hasPendingUnsafe && steps.every((s) => s.status === "executed" || s.status === "skipped")) {
    newStatus = "resolved";
    resolvedAt = new Date();
  }

  const plan = { ...c.resolutionPlan, workflowSteps: steps };

  let responseDraft = c.responseDraft;
  if (newStatus !== "escalated") {
    const classification: AIClassification = {
      intent: c.intent ?? "general_inquiry",
      sentiment: c.sentiment ?? "neutral",
      sentimentScore: c.sentimentScore ?? 0,
      urgency: c.urgency ?? "medium",
      confidence: c.confidence ?? 0.5,
      automationSafe: c.automationSafe ?? true,
      neededContext: [],
      explanation: "",
      keywords: [],
    };
    responseDraft = await draftResponse(classification, customer, order, plan);
  }

  const updated = await updateCase(c.id, {
    resolutionPlan: plan,
    workflowSteps: steps,
    responseDraft,
    status: newStatus,
    resolvedAt,
  });

  for (let i = 0; i < auditDetails.length; i++) {
    await appendAudit({
      caseId: c.id,
      customerId: c.customerId,
      actorId: user.id,
      actorType: "ai",
      action: `workflow.execute:${steps[i].action}`,
      category: "action",
      detail: auditDetails[i],
      metadata: { step: steps[i] },
    });
  }

  if (newStatus === "resolved") {
    await bumpMetric("autoResolved", 1);
    await bumpMetric("open", -1);
    await bumpMetric("estimatedHoursSaved", 0.5);
  } else if (newStatus === "escalated") {
    await bumpMetric("escalated", 1);
    await bumpMetric("open", -1);
  }

  await appendAudit({
    caseId: c.id,
    customerId: c.customerId,
    actorId: user.id,
    actorType: "system",
    action: `case.${newStatus}`,
    category: "state",
    detail:
      newStatus === "resolved"
        ? `Case marked resolved — ${steps.length} step(s) executed, financial impact ${totalImpactCents >= 0 ? "+" : ""}$${(Math.abs(totalImpactCents) / 100).toFixed(2)}.`
        : `Case escalated — ${steps.filter((s) => s.status === "skipped").length} step(s) require human approval.`,
    metadata: { totalImpactCents, status: newStatus },
  });

  return NextResponse.json({
    case: updated,
    steps,
    responseDraft,
    totalImpactCents,
    status: newStatus,
  });
}
