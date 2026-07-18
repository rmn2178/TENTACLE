import "server-only";
import {
  getStore,
  upsertCase,
  appendAudit as storeAppendAudit,
  bumpMetrics,
  nextCaseNumber as storeNextCaseNumber,
  getSettings as storeGetSettings,
  updateSettings as storeUpdateSettings,
  resetSettings as storeResetSettings,
} from "@/lib/data/store";
import type {
  CaseRecord,
  Customer,
  Order,
  Policy,
  AuditEntry,
  DashboardMetrics,
  RetrievalHit,
  ResolutionPlan,
  WorkflowStep,
} from "@/types";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { randomUUID } from "crypto";

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerById(id: string): Promise<Customer | null> {
  return getStore().customers.find((c) => c.id === id) ?? null;
}

export async function getCustomers(): Promise<Customer[]> {
  return [...getStore().customers].sort((a, b) => a.name.localeCompare(b.name));
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function getOrderById(id: string): Promise<Order | undefined> {
  return getStore().orders.find((o) => o.id === id);
}

export async function getOrders(): Promise<Order[]> {
  return [...getStore().orders].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
  );
}

export async function getOrdersByCustomer(customerId: string): Promise<Order[]> {
  return getStore()
    .orders.filter((o) => o.customerId === customerId)
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

// ── Policies ─────────────────────────────────────────────────────────────────

export async function getPolicies(): Promise<Policy[]> {
  return [...getStore().policies].sort((a, b) => b.weight - a.weight);
}

export async function getPolicyByCode(code: string): Promise<Policy | null> {
  return getStore().policies.find((p) => p.code === code) ?? null;
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export async function getCaseById(id: string): Promise<CaseRecord | null> {
  return getStore().cases.find((c) => c.id === id) ?? null;
}

export async function getCaseByNumber(caseNumber: string): Promise<CaseRecord | null> {
  return getStore().cases.find((c) => c.caseNumber === caseNumber) ?? null;
}

export async function getCases(): Promise<CaseRecord[]> {
  return [...getStore().cases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCasesByCustomer(customerId: string): Promise<CaseRecord[]> {
  return getStore()
    .cases.filter((c) => c.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCasesByStatus(status: string): Promise<CaseRecord[]> {
  return getStore()
    .cases.filter((c) => c.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── Case mutations ────────────────────────────────────────────────────────────

export interface UpdateCaseInput {
  intent?: CaseRecord["intent"];
  sentiment?: CaseRecord["sentiment"];
  sentimentScore?: number;
  urgency?: CaseRecord["urgency"];
  confidence?: number;
  automationSafe?: boolean;
  status?: CaseRecord["status"];
  resolutionPlan?: ResolutionPlan;
  responseDraft?: string;
  workflowSteps?: WorkflowStep[];
  escalationReason?: string;
  assignedAgentId?: string;
  resolvedAt?: Date;
  retrievalHits?: RetrievalHit[];
}

export async function updateCase(id: string, patch: UpdateCaseInput): Promise<CaseRecord> {
  const store = getStore();
  const idx = store.cases.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error(`Case ${id} not found`);
  const existing = store.cases[idx];
  const updated: CaseRecord = {
    ...existing,
    ...(patch.intent !== undefined && { intent: patch.intent }),
    ...(patch.sentiment !== undefined && { sentiment: patch.sentiment }),
    ...(patch.sentimentScore !== undefined && { sentimentScore: patch.sentimentScore }),
    ...(patch.urgency !== undefined && { urgency: patch.urgency }),
    ...(patch.confidence !== undefined && { confidence: patch.confidence }),
    ...(patch.automationSafe !== undefined && { automationSafe: patch.automationSafe }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.resolutionPlan !== undefined && { resolutionPlan: patch.resolutionPlan }),
    ...(patch.responseDraft !== undefined && { responseDraft: patch.responseDraft }),
    ...(patch.workflowSteps !== undefined && { workflowSteps: patch.workflowSteps }),
    ...(patch.escalationReason !== undefined && { escalationReason: patch.escalationReason }),
    ...(patch.assignedAgentId !== undefined && { assignedAgent: patch.assignedAgentId }),
    ...(patch.resolvedAt !== undefined && { resolvedAt: patch.resolvedAt.toISOString() }),
    ...(patch.retrievalHits !== undefined && { retrievalHits: patch.retrievalHits }),
    updatedAt: new Date().toISOString(),
  };
  store.cases[idx] = updated;
  return updated;
}

export interface CreateCaseInput {
  caseNumber: string;
  customerId: string;
  orderId?: string;
  channel: CaseRecord["channel"];
  subject: string;
  message: string;
  slaDueAt?: Date;
}

export async function createCase(input: CreateCaseInput): Promise<CaseRecord> {
  const now = new Date().toISOString();
  const newCase: CaseRecord = {
    id: `cas_${randomUUID().slice(0, 8)}`,
    caseNumber: input.caseNumber,
    customerId: input.customerId,
    orderId: input.orderId,
    channel: input.channel,
    subject: input.subject,
    message: input.message,
    status: "new",
    slaDueAt: input.slaDueAt?.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  upsertCase(newCase);
  return newCase;
}

export async function createCaseWithAudit(
  input: CreateCaseInput,
  audit: {
    actorId?: string;
    actorType: AuditEntry["actor"];
    action: string;
    category: AuditEntry["category"];
    detail: string;
    metadata?: Record<string, unknown>;
  }
): Promise<CaseRecord> {
  const newCase = await createCase(input);
  await appendAudit({
    caseId: newCase.id,
    customerId: input.customerId,
    actorId: audit.actorId,
    actorType: audit.actorType,
    action: audit.action,
    category: audit.category,
    detail: audit.detail,
    metadata: audit.metadata,
  });
  return newCase;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function appendAudit(input: {
  caseId?: string;
  customerId?: string;
  actorId?: string;
  actorType: AuditEntry["actor"];
  action: string;
  category: AuditEntry["category"];
  detail: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const store = getStore();
  const customer = input.customerId
    ? store.customers.find((c) => c.id === input.customerId)
    : undefined;
  const caseRecord = input.caseId
    ? store.cases.find((c) => c.id === input.caseId)
    : undefined;

  const entry: AuditEntry = {
    id: `aud_${randomUUID().slice(0, 8)}`,
    caseId: input.caseId,
    caseNumber: caseRecord?.caseNumber,
    customerId: input.customerId,
    customerName: customer?.name,
    actor: input.actorType,
    action: input.action,
    category: input.category,
    detail: input.detail,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  storeAppendAudit(entry);
}

export async function getAuditEntries(limit = 50, caseId?: string): Promise<AuditEntry[]> {
  const store = getStore();
  const entries = caseId
    ? store.audit.filter((a) => a.caseId === caseId)
    : store.audit;
  return entries.slice(0, limit);
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export async function getMetrics(): Promise<DashboardMetrics> {
  const store = getStore();
  const cases = store.cases;
  const totalCases = cases.length;
  const autoResolved = cases.filter((c) => c.status === "resolved").length;
  const escalated = cases.filter((c) => c.status === "escalated").length;
  const open = cases.filter(
    (c) => c.status !== "resolved" && c.status !== "escalated"
  ).length;

  return {
    ...store.metrics,
    totalCases: totalCases || store.metrics.totalCases,
    autoResolved: autoResolved || store.metrics.autoResolved,
    escalated: escalated || store.metrics.escalated,
    open: open || store.metrics.open,
  };
}

export async function bumpMetric(key: string, delta: number): Promise<void> {
  const validKeys = ["totalCases", "autoResolved", "escalated", "open", "estimatedHoursSaved"] as const;
  if (validKeys.includes(key as (typeof validKeys)[number])) {
    bumpMetrics(key as (typeof validKeys)[number], delta);
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  return storeGetSettings();
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return storeUpdateSettings(patch);
}

export async function resetSettings(): Promise<AppSettings> {
  return storeResetSettings();
}

// ── Case number ───────────────────────────────────────────────────────────────

export async function nextCaseNumber(): Promise<string> {
  return storeNextCaseNumber();
}

// ── Re-exports for compatibility ──────────────────────────────────────────────
export { DEFAULT_SETTINGS };
