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
import { planResolution } from "@/lib/ai/planner";
import { shouldEscalate, evaluateRules, getApplicablePolicies } from "@/lib/workflow/rules";
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
  if (!c.intent) {
    return NextResponse.json({ error: "Case must be classified first" }, { status: 400 });
  }

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = c.orderId ? await getOrderById(c.orderId) : undefined;
  const allPolicies = await getPolicies();
  const applicablePolicies = getApplicablePolicies(c.intent, allPolicies);

  const classification: AIClassification = {
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

  const ruleResults = evaluateRules(classification, customer, order, allPolicies);
  const escalationCheck = shouldEscalate(classification, order, ruleResults);

  const plan = await planResolution(
    classification,
    customer,
    order,
    applicablePolicies,
    c.retrievalHits ?? []
  );

  const escalationReason = escalationCheck.escalate ? escalationCheck.reason : undefined;
  const newStatus = canTransition(c.status, "planned") ? "planned" : c.status;
  const updated = await updateCase(c.id, {
    resolutionPlan: plan,
    workflowSteps: plan.workflowSteps,
    escalationReason,
    status: newStatus,
  });

  await appendAudit({
    caseId: c.id,
    customerId: c.customerId,
    actorId: user.id,
    actorType: "ai",
    action: "case.plan",
    category: "planning",
    detail: `Plan generated: ${plan.workflowSteps.length} step(s), est. ${plan.estimatedResolutionMins}m. ${escalationReason ? `Escalation flagged: ${escalationReason}` : "Automation-safe."}`,
    metadata: { plan, escalationReason },
  });

  return NextResponse.json({ case: updated, plan, escalationReason });
}
