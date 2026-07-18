import { createHash } from "crypto";
import type { WorkflowStep, CaseRecord, Order } from "@/types";
import { logger } from "@/lib/observability/logger";
import { metrics, BUCKETS } from "@/lib/observability/metrics";

// Execute a single workflow step. Returns the updated step + a short result string.
export interface ActionResult {
  step: WorkflowStep;
  auditDetail: string;
  financialImpactCents?: number;
  idempotencyKey: string;
  wasAlreadyExecuted: boolean;
}

/**
 * Generate a deterministic idempotency key for a workflow step.
 * The same step on the same case always produces the same key, so if the
 * pipeline is re-run (e.g. after a crash), already-executed steps are skipped
 * rather than double-executing financial actions like refunds.
 */
export function generateIdempotencyKey(caseId: string, stepId: string, action: string): string {
  return createHash("sha256")
    .update(`${caseId}:${stepId}:${action}`)
    .digest("hex")
    .slice(0, 32);
}

export function executeStep(
  step: WorkflowStep,
  caseRecord: CaseRecord,
  order?: Order
): ActionResult {
  const idempotencyKey = generateIdempotencyKey(caseRecord.id, step.id, step.action);

  // Idempotency check — if already executed, return the existing result
  if (step.status === "executed") {
    logger.info("workflow_step_already_executed", {
      caseId: caseRecord.id,
      stepId: step.id,
      action: step.action,
      idempotencyKey,
    });
    return {
      step,
      auditDetail: `Step "${step.label}" already executed (idempotent skip).`,
      idempotencyKey,
      wasAlreadyExecuted: true,
    };
  }

  // Escalation is always safe to execute — it IS the safe action when automation is unsafe
  if (!step.safeToAuto && step.action !== "escalate") {
    logger.info("workflow_step_skipped_unsafe", {
      caseId: caseRecord.id,
      stepId: step.id,
      stepLabel: step.label,
    });
    return {
      step: { ...step, status: "skipped" },
      auditDetail: `Step "${step.label}" skipped — not safe to auto-execute. Awaiting human approval.`,
      idempotencyKey,
      wasAlreadyExecuted: false,
    };
  }

  const startTime = performance.now();
  let result = "";
  let financialImpactCents: number | undefined;
  const nowIso = new Date().toISOString();

  switch (step.action) {
    case "refund": {
      const amount = order?.totalCents ?? 0;
      // Deterministic refund ID from idempotency key (not random) so re-runs produce the same ID
      const refundId = `ref_${idempotencyKey.slice(0, 8)}`;
      result = `Refund of $${(amount / 100).toFixed(2)} issued to original payment method. Refund ID: ${refundId}. Idempotency key: ${idempotencyKey}.`;
      financialImpactCents = -amount;
      metrics.increment("workflow.refunds_issued", 1, { type: "auto" });
      metrics.histogram("workflow.refund_amount_cents", amount, {}, BUCKETS.refundCents);
      break;
    }
    case "replacement": {
      const replacementId = `rpl_${idempotencyKey.slice(0, 8)}`;
      result = `Replacement order ${order?.orderNumber ?? ""}-R1 (ID: ${replacementId}) created and queued for fulfillment. Carrier: Marigold Express. Tracking will be sent within 24h.`;
      metrics.increment("workflow.replacements_issued", 1, { type: "auto" });
      break;
    }
    case "cancel": {
      const refundId = `ref_${idempotencyKey.slice(0, 8)}`;
      const cancelAmount = order?.totalCents ?? 0;
      result = `Order ${order?.orderNumber ?? ""} cancelled. Refund of $${(cancelAmount / 100).toFixed(2)} queued to original payment method. Refund ID: ${refundId}.`;
      financialImpactCents = -cancelAmount;
      metrics.increment("workflow.cancellations", 1, { type: "auto" });
      metrics.histogram("workflow.refund_amount_cents", cancelAmount, {}, BUCKETS.refundCents);
      break;
    }
    case "address_update": {
      result = `Shipping address updated for order ${order?.orderNumber ?? ""}. New address will be sent to the carrier at pickup.`;
      metrics.increment("workflow.address_updates", 1);
      break;
    }
    case "issue_credit": {
      const credit = 1000;
      const creditCode = `MC-${idempotencyKey.slice(0, 6).toUpperCase()}`;
      result = `Store credit of $${(credit / 100).toFixed(2)} issued to customer account. Credit code: ${creditCode}.`;
      financialImpactCents = -credit;
      metrics.increment("workflow.credits_issued", 1);
      metrics.histogram("workflow.refund_amount_cents", credit, {}, BUCKETS.refundCents);
      break;
    }
    case "schedule_callback": {
      result = `Callback scheduled within 4 business hours. Customer notified via ${caseRecord.channel}.`;
      metrics.increment("workflow.callbacks_scheduled", 1);
      break;
    }
    case "send_response": {
      result = `Customer response drafted and sent via ${caseRecord.channel}.`;
      metrics.increment("workflow.responses_sent", 1);
      break;
    }
    case "escalate": {
      result = `Case escalated to human queue with AI summary attached. ETA: 8 business hours.`;
      metrics.increment("workflow.escalations", 1);
      break;
    }
    default: {
      result = `Step "${step.label}" executed.`;
    }
  }

  const duration = performance.now() - startTime;
  metrics.histogram("workflow.step_duration_ms", duration, { action: step.action }, BUCKETS.durationMs);

  logger.info("workflow_step_executed", {
    caseId: caseRecord.id,
    stepId: step.id,
    action: step.action,
    financialImpact: financialImpactCents,
    idempotencyKey,
    duration_ms: Math.round(duration),
  });

  return {
    step: { ...step, status: "executed", executedAt: nowIso, result },
    auditDetail: result,
    financialImpactCents,
    idempotencyKey,
    wasAlreadyExecuted: false,
  };
}

// Execute all safe-to-auto steps in sequence
export function executePlan(
  caseRecord: CaseRecord,
  order?: Order
): { steps: WorkflowStep[]; auditDetails: string[]; totalImpactCents: number } {
  const plan = caseRecord.resolutionPlan;
  if (!plan) {
    return { steps: [], auditDetails: [], totalImpactCents: 0 };
  }
  const executed: WorkflowStep[] = [];
  const auditDetails: string[] = [];
  let totalImpactCents = 0;
  let hitUnsafe = false;

  for (const step of plan.workflowSteps) {
    if (hitUnsafe && step.action !== "escalate") {
      // Once we hit an unsafe step, subsequent steps wait for human approval
      executed.push(step);
      continue;
    }
    const result = executeStep(step, caseRecord, order);
    executed.push(result.step);
    auditDetails.push(result.auditDetail);
    if (result.financialImpactCents) {
      totalImpactCents += result.financialImpactCents;
    }
    if (result.step.status === "skipped") {
      hitUnsafe = true;
    }
  }

  return { steps: executed, auditDetails, totalImpactCents };
}
