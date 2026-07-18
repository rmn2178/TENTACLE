import { NextRequest, NextResponse } from "next/server";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  updateCase,
  appendAudit,
  bumpMetric,
  getPolicies,
  getCases,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { classifyMessage } from "@/lib/ai/classify";
import { retrieve } from "@/lib/ai/retrieve";
import { planResolution } from "@/lib/ai/planner";
import { draftResponse } from "@/lib/ai/responder";
import { executePlan } from "@/lib/workflow/actions";
import { evaluateRules, getApplicablePolicies, shouldEscalate } from "@/lib/workflow/rules";
import { canTransition } from "@/lib/workflow/stateMachine";
import { intentLabel } from "@/lib/utils/format";
import { caseIdSchema } from "@/lib/validation/apiSchemas";
import type {
  CaseRecord,
  AIClassification,
  ResolutionPlan,
  RetrievalHit,
} from "@/types";

export const runtime = "nodejs";

interface TraceEntry {
  stage: string;
  durationMs: number;
  detail: string;
}

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

  const original = await getCaseById(caseId);
  if (!original) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(original.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = original.orderId ? await getOrderById(original.orderId) : undefined;

  const trace: TraceEntry[] = [];
  let current: CaseRecord = { ...original };

  // 1. Classify
  const t0 = Date.now();
  const classification: AIClassification = await classifyMessage(current.message, current.subject, {
    orderTotalCents: order?.totalCents,
    customerTier: customer.tier,
  });
  const newStatus1 = canTransition(current.status, "classified") ? "classified" : current.status;
  current = await updateCase(current.id, {
    intent: classification.intent,
    sentiment: classification.sentiment,
    sentimentScore: classification.sentimentScore,
    urgency: classification.urgency,
    confidence: classification.confidence,
    automationSafe: classification.automationSafe,
    status: newStatus1,
  });
  trace.push({
    stage: "classify",
    durationMs: Date.now() - t0,
    detail: `Intent=${intentLabel(classification.intent)}, sentiment=${classification.sentiment}, urgency=${classification.urgency}, confidence=${(classification.confidence * 100).toFixed(0)}%`,
  });
  await appendAudit({
    caseId: current.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "ai",
    action: "case.classify",
    category: "classification",
    detail: trace[0].detail,
    metadata: { model: "gemini-classifier", ...classification },
  });

  // 2. Retrieve
  const t1 = Date.now();
  const allPolicies = await getPolicies();
  const allCases = await getCases();
  const hits: RetrievalHit[] = retrieve(classification.intent, customer, order, allPolicies, allCases);
  const applicablePolicies = getApplicablePolicies(classification.intent, allPolicies);
  const ruleResults = evaluateRules(classification, customer, order, allPolicies);
  const newStatus2 = canTransition(current.status, "retrieved") ? "retrieved" : current.status;
  current = await updateCase(current.id, {
    retrievalHits: hits,
    status: newStatus2,
  });
  trace.push({
    stage: "retrieve",
    durationMs: Date.now() - t1,
    detail: `${hits.length} context items retrieved, ${applicablePolicies.length} policies evaluated`,
  });
  await appendAudit({
    caseId: current.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "ai",
    action: "case.retrieve",
    category: "retrieval",
    detail: trace[1].detail,
    metadata: { hits, ruleResults },
  });

  // 3. Plan
  const t2 = Date.now();
  const plan: ResolutionPlan = await planResolution(
    classification,
    customer,
    order,
    applicablePolicies,
    hits
  );
  const escalationCheck = shouldEscalate(classification, order, ruleResults);
  const escalationReason = escalationCheck.escalate ? escalationCheck.reason : undefined;
  const newStatus3 = canTransition(current.status, "planned") ? "planned" : current.status;
  current = await updateCase(current.id, {
    resolutionPlan: plan,
    workflowSteps: plan.workflowSteps,
    escalationReason,
    status: newStatus3,
  });
  trace.push({
    stage: "plan",
    durationMs: Date.now() - t2,
    detail: `Plan with ${plan.workflowSteps.length} step(s). ${escalationReason ? `Escalation flagged.` : `Automation-safe.`}`,
  });
  await appendAudit({
    caseId: current.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "ai",
    action: "case.plan",
    category: "planning",
    detail: trace[2].detail,
    metadata: { plan, escalationReason },
  });

  // 4. Act
  const t3 = Date.now();
  const { steps, auditDetails, totalImpactCents } = executePlan(current, order);
  const hasPendingUnsafe = steps.some((s) => s.status === "pending" && !s.safeToAuto);
  const hasEscalateStep = steps.some((s) => s.action === "escalate" && s.status === "executed");

  let finalStatus: CaseRecord["status"] = "acted";
  let resolvedAt: Date | undefined;
  if (hasEscalateStep) {
    finalStatus = "escalated";
  } else if (!hasPendingUnsafe && steps.every((s) => s.status === "executed" || s.status === "skipped")) {
    finalStatus = "resolved";
    resolvedAt = new Date();
  }

  let responseDraft = current.responseDraft;
  if (finalStatus !== "escalated") {
    responseDraft = await draftResponse(classification, customer, order, { ...plan, workflowSteps: steps });
  }

  current = await updateCase(current.id, {
    resolutionPlan: { ...plan, workflowSteps: steps },
    workflowSteps: steps,
    responseDraft,
    status: finalStatus,
    resolvedAt,
  });
  trace.push({
    stage: "act",
    durationMs: Date.now() - t3,
    detail: `${steps.filter((s) => s.status === "executed").length}/${steps.length} step(s) executed → ${finalStatus}`,
  });

  for (let i = 0; i < auditDetails.length; i++) {
    await appendAudit({
      caseId: current.id,
      customerId: customer.id,
      actorId: user.id,
      actorType: "ai",
      action: `workflow.execute:${steps[i].action}`,
      category: "action",
      detail: auditDetails[i],
      metadata: { step: steps[i] },
    });
  }

  if (finalStatus === "resolved") {
    await bumpMetric("autoResolved", 1);
    await bumpMetric("open", -1);
    await bumpMetric("estimatedHoursSaved", 0.5);
  } else if (finalStatus === "escalated") {
    await bumpMetric("escalated", 1);
    await bumpMetric("open", -1);
  }

  await appendAudit({
    caseId: current.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "system",
    action: `case.${finalStatus}`,
    category: "state",
    detail:
      finalStatus === "resolved"
        ? `Case resolved via autonomous pipeline — ${steps.length} step(s), financial impact ${totalImpactCents >= 0 ? "+" : "-"}$${(Math.abs(totalImpactCents) / 100).toFixed(2)}.`
        : `Case escalated — ${steps.filter((s) => s.status === "skipped").length} step(s) require human approval.`,
    metadata: { totalImpactCents, status: finalStatus, trace },
  });

  return NextResponse.json({
    case: current,
    classification,
    hits,
    plan: current.resolutionPlan,
    steps: current.workflowSteps,
    responseDraft,
    status: finalStatus,
    trace,
    totalImpactCents,
  });
}
