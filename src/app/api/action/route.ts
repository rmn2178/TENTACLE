import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCaseById,
  getCustomerById,
  getOrderById,
  updateCase,
  appendAudit,
  bumpMetric,
} from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { canTransition } from "@/lib/workflow/stateMachine";
import type { WorkflowStep, CaseRecord } from "@/types";

export const runtime = "nodejs";

const actionSchema = z.object({
  caseId: z.string().min(1),
  action: z.enum([
    "refund",
    "replacement",
    "cancel",
    "address_update",
    "issue_credit",
    "send_response",
    "schedule_callback",
    "escalate",
  ]),
  amount: z.number().positive().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { caseId, action, amount, address, note } = parsed.data;

  const c = await getCaseById(caseId);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const order = c.orderId ? await getOrderById(c.orderId) : undefined;

  const stepLabels: Record<string, { label: string; description: string }> = {
    refund: { label: "Issue refund", description: `Refund ${amount ? `$${amount.toFixed(2)}` : "full order amount"} to original payment method.` },
    replacement: { label: "Dispatch replacement", description: `Queue replacement for ${order?.orderNumber ?? "order"} at no cost.` },
    cancel: { label: "Cancel order", description: `Cancel ${order?.orderNumber ?? "order"} and issue full refund.` },
    address_update: { label: "Update shipping address", description: address ? `Update address to: ${address}` : `Update shipping address for ${order?.orderNumber ?? "order"}.` },
    issue_credit: { label: "Issue store credit", description: `Issue $${(amount ?? 10).toFixed(2)} store credit to customer account.` },
    send_response: { label: "Send response", description: "Send the drafted response to the customer." },
    schedule_callback: { label: "Schedule callback", description: "Schedule a phone callback within 4 business hours." },
    escalate: { label: "Escalate to senior agent", description: "Forward case to human queue with AI summary." },
  };

  const meta = stepLabels[action];
  const step: WorkflowStep = {
    id: `manual_${Date.now()}`,
    label: meta.label,
    description: meta.description,
    action,
    status: "pending",
    safeToAuto: false,
  };

  let resultDetail = "";
  let financialImpactCents = 0;
  let newStatus: CaseRecord["status"] = c.status;

  switch (action) {
    case "refund": {
      const refundAmount = amount ? Math.round(amount * 100) : (order?.totalCents ?? 0);
      const refId = `ref_${Math.random().toString(36).slice(2, 10)}`;
      resultDetail = `Refund of $${(refundAmount / 100).toFixed(2)} issued to original payment method. Refund ID: ${refId}.${note ? ` Agent note: ${note}` : ""}`;
      financialImpactCents = -refundAmount;
      break;
    }
    case "replacement": {
      resultDetail = `Replacement order ${order?.orderNumber ?? ""}-R1 created and queued for fulfillment. Carrier: Marigold Express. Tracking will be sent within 24h.`;
      break;
    }
    case "cancel": {
      const refundAmount = order?.totalCents ?? 0;
      resultDetail = `Order ${order?.orderNumber ?? ""} cancelled. Refund of $${(refundAmount / 100).toFixed(2)} queued to original payment method.`;
      financialImpactCents = -refundAmount;
      break;
    }
    case "address_update": {
      resultDetail = `Shipping address updated for order ${order?.orderNumber ?? ""}. New address: ${address ?? "(not provided)"}. Will be sent to carrier at pickup.`;
      break;
    }
    case "issue_credit": {
      const creditCents = Math.round((amount ?? 10) * 100);
      const code = `MC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      resultDetail = `Store credit of $${(creditCents / 100).toFixed(2)} issued. Credit code: ${code}.`;
      financialImpactCents = -creditCents;
      break;
    }
    case "schedule_callback": {
      resultDetail = `Callback scheduled within 4 business hours. Customer notified via ${c.channel}.`;
      break;
    }
    case "send_response": {
      resultDetail = `Customer response sent via ${c.channel}.`;
      break;
    }
    case "escalate": {
      resultDetail = `Case escalated to human queue with AI summary attached. ETA: 8 business hours.`;
      newStatus = "escalated";
      break;
    }
  }

  if (action === "escalate") {
    newStatus = "escalated";
    await bumpMetric("escalated", 1);
    await bumpMetric("open", -1);
  } else if (action === "send_response" || action === "refund" || action === "replacement" || action === "cancel") {
    if (c.status !== "escalated") {
      newStatus = "resolved";
      await bumpMetric("autoResolved", 1);
      if (["new", "classified", "retrieved", "planned", "acted"].includes(c.status)) {
        await bumpMetric("open", -1);
      }
    }
  } else if (canTransition(c.status, "acted")) {
    newStatus = "acted";
  }

  const executedStep: WorkflowStep = {
    ...step,
    status: "executed",
    executedAt: new Date().toISOString(),
    result: resultDetail,
  };

  const existingSteps = c.workflowSteps ?? [];
  const updated = await updateCase(c.id, {
    workflowSteps: [...existingSteps, executedStep],
    status: newStatus,
    resolvedAt: newStatus === "resolved" ? new Date() : undefined,
    assignedAgentId: action === "escalate" ? user.id : undefined,
  });

  await appendAudit({
    caseId: c.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "agent",
    action: `workflow.execute:${action}`,
    category: action === "escalate" ? "escalation" : "action",
    detail: resultDetail,
    metadata: { step: executedStep, financialImpactCents, manual: true },
  });

  if (newStatus !== c.status) {
    await appendAudit({
      caseId: c.id,
      customerId: customer.id,
      actorId: user.id,
      actorType: "agent",
      action: `case.${newStatus}`,
      category: "state",
      detail: `Case marked ${newStatus} by ${user.name} via action: ${meta.label}.`,
      metadata: { status: newStatus, financialImpactCents },
    });
  }

  return NextResponse.json({
    case: updated,
    step: executedStep,
    result: resultDetail,
    financialImpactCents,
    status: newStatus,
  });
}
