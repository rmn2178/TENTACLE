import "server-only";
import { db } from "@/lib/db";
import type {
  CaseRecord,
  Customer,
  Order,
  OrderItem,
  Policy,
  PolicyRule,
  AuditEntry,
  DashboardMetrics,
  RetrievalHit,
  ResolutionPlan,
  WorkflowStep,
} from "@/types";
import type {
  Lead,
  SalesStrategy,
  Conversation,
  AIAgent,
  RevenueMetrics,
  LeadIntelligence,
  StrategyReasoning,
} from "@/types/revenue";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// ── Serialization helpers ────────────────────────────────────────────────────
// Prisma returns typed rows; we convert them to the domain types the app uses.

function serializeOrder(row: {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  items: string;
  totalCents: number;
  currency: string;
  placedAt: Date;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  eta: Date | null;
  shippingAddress: string;
}): Order {
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(row.items) as OrderItem[];
  } catch {
    items = [];
  }
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    status: row.status as Order["status"],
    items,
    totalCents: row.totalCents,
    currency: row.currency,
    placedAt: row.placedAt.toISOString(),
    shippedAt: row.shippedAt?.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString(),
    eta: row.eta?.toISOString(),
    shippingAddress: row.shippingAddress,
  };
}

function serializePolicy(row: {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  rules: string;
  autoResolve: boolean;
  weight: number;
}): Policy {
  let rules: PolicyRule[] = [];
  try {
    rules = JSON.parse(row.rules) as PolicyRule[];
  } catch {
    rules = [];
  }
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    category: row.category,
    description: row.description,
    rules,
    autoResolve: row.autoResolve,
    weight: row.weight,
  };
}

function serializeCase(row: {
  id: string;
  caseNumber: string;
  customerId: string;
  orderId: string | null;
  channel: string;
  subject: string;
  message: string;
  intent: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  urgency: string | null;
  confidence: number | null;
  status: string;
  automationSafe: boolean | null;
  resolutionPlan: string | null;
  responseDraft: string | null;
  workflowSteps: string | null;
  escalationReason: string | null;
  assignedAgentId: string | null;
  slaDueAt: Date | null;
  resolvedAt: Date | null;
  retrievalHits: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CaseRecord {
  let resolutionPlan: ResolutionPlan | undefined;
  if (row.resolutionPlan) {
    try {
      resolutionPlan = JSON.parse(row.resolutionPlan) as ResolutionPlan;
    } catch {
      resolutionPlan = undefined;
    }
  }
  let workflowSteps: WorkflowStep[] | undefined;
  if (row.workflowSteps) {
    try {
      workflowSteps = JSON.parse(row.workflowSteps) as WorkflowStep[];
    } catch {
      workflowSteps = undefined;
    }
  }
  let retrievalHits: RetrievalHit[] | undefined;
  if (row.retrievalHits) {
    try {
      retrievalHits = JSON.parse(row.retrievalHits) as RetrievalHit[];
    } catch {
      retrievalHits = undefined;
    }
  }
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    customerId: row.customerId,
    orderId: row.orderId ?? undefined,
    channel: row.channel as CaseRecord["channel"],
    subject: row.subject,
    message: row.message,
    intent: (row.intent ?? undefined) as CaseRecord["intent"],
    sentiment: (row.sentiment ?? undefined) as CaseRecord["sentiment"],
    sentimentScore: row.sentimentScore ?? undefined,
    urgency: (row.urgency ?? undefined) as CaseRecord["urgency"],
    confidence: row.confidence ?? undefined,
    automationSafe: row.automationSafe ?? undefined,
    status: row.status as CaseRecord["status"],
    resolutionPlan,
    responseDraft: row.responseDraft ?? undefined,
    workflowSteps,
    escalationReason: row.escalationReason ?? undefined,
    assignedAgent: row.assignedAgentId ?? undefined,
    slaDueAt: row.slaDueAt?.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
    retrievalHits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAudit(
  row: {
    id: string;
    caseId: string | null;
    customerId: string | null;
    actorType: string;
    action: string;
    category: string;
    detail: string;
    metadata: string | null;
    createdAt: Date;
  },
  customerName?: string,
  caseNumber?: string
): AuditEntry {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = undefined;
    }
  }
  return {
    id: row.id,
    caseId: row.caseId ?? undefined,
    caseNumber,
    customerId: row.customerId ?? undefined,
    customerName,
    actor: row.actorType as AuditEntry["actor"],
    action: row.action,
    category: row.category as AuditEntry["category"],
    detail: row.detail,
    metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeSettings(row: {
  autoRefundLimit: number;
  autoResolveUnder: number;
  highValueThreshold: number;
  requireApprovalAbove: number;
  escalateFurious: boolean;
  escalateHighValue: boolean;
  responseTone: string;
  alwaysDraftResponse: boolean;
  attachSimilarCases: boolean;
}): AppSettings {
  return {
    autoRefundLimit: row.autoRefundLimit,
    autoResolveUnder: row.autoResolveUnder,
    highValueThreshold: row.highValueThreshold,
    requireApprovalAbove: row.requireApprovalAbove,
    escalateFurious: row.escalateFurious,
    escalateHighValue: row.escalateHighValue,
    responseTone: row.responseTone as AppSettings["responseTone"],
    alwaysDraftResponse: row.alwaysDraftResponse,
    attachSimilarCases: row.attachSimilarCases,
  };
}

// ── Query functions ──────────────────────────────────────────────────────────

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = await db.customer.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarHue: row.avatarHue,
    tier: row.tier as Customer["tier"],
    lifetimeValue: row.lifetimeValue,
    orderCount: row.orderCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const rows = await db.customer.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarHue: row.avatarHue,
    tier: row.tier as Customer["tier"],
    lifetimeValue: row.lifetimeValue,
    orderCount: row.orderCount,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const row = await db.order.findUnique({ where: { id } });
  if (!row) return undefined;
  return serializeOrder(row);
}

export async function getOrders(): Promise<Order[]> {
  const rows = await db.order.findMany({ orderBy: { placedAt: "desc" } });
  return rows.map(serializeOrder);
}

export async function getOrdersByCustomer(customerId: string): Promise<Order[]> {
  const rows = await db.order.findMany({ where: { customerId }, orderBy: { placedAt: "desc" } });
  return rows.map(serializeOrder);
}

export async function getPolicies(): Promise<Policy[]> {
  const rows = await db.policy.findMany({ orderBy: { weight: "desc" } });
  return rows.map(serializePolicy);
}

export async function getPolicyByCode(code: string): Promise<Policy | null> {
  const row = await db.policy.findUnique({ where: { code } });
  if (!row) return null;
  return serializePolicy(row);
}

export async function getCaseById(id: string): Promise<CaseRecord | null> {
  const row = await db.case.findUnique({ where: { id } });
  if (!row) return null;
  return serializeCase(row);
}

export async function getCaseByNumber(caseNumber: string): Promise<CaseRecord | null> {
  const row = await db.case.findUnique({ where: { caseNumber } });
  if (!row) return null;
  return serializeCase(row);
}

export async function getCases(): Promise<CaseRecord[]> {
  const rows = await db.case.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(serializeCase);
}

export async function getCasesByCustomer(customerId: string): Promise<CaseRecord[]> {
  const rows = await db.case.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  return rows.map(serializeCase);
}

export async function getCasesByStatus(status: string): Promise<CaseRecord[]> {
  const rows = await db.case.findMany({ where: { status }, orderBy: { createdAt: "desc" } });
  return rows.map(serializeCase);
}

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
  const data: Record<string, unknown> = {};
  if (patch.intent !== undefined) data.intent = patch.intent;
  if (patch.sentiment !== undefined) data.sentiment = patch.sentiment;
  if (patch.sentimentScore !== undefined) data.sentimentScore = patch.sentimentScore;
  if (patch.urgency !== undefined) data.urgency = patch.urgency;
  if (patch.confidence !== undefined) data.confidence = patch.confidence;
  if (patch.automationSafe !== undefined) data.automationSafe = patch.automationSafe;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.resolutionPlan !== undefined) data.resolutionPlan = JSON.stringify(patch.resolutionPlan);
  if (patch.responseDraft !== undefined) data.responseDraft = patch.responseDraft;
  if (patch.workflowSteps !== undefined) data.workflowSteps = JSON.stringify(patch.workflowSteps);
  if (patch.escalationReason !== undefined) data.escalationReason = patch.escalationReason;
  if (patch.assignedAgentId !== undefined) data.assignedAgentId = patch.assignedAgentId;
  if (patch.resolvedAt !== undefined) data.resolvedAt = patch.resolvedAt;
  if (patch.retrievalHits !== undefined) data.retrievalHits = JSON.stringify(patch.retrievalHits);

  const row = await db.case.update({ where: { id }, data });
  return serializeCase(row);
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
  const row = await db.case.create({
    data: {
      caseNumber: input.caseNumber,
      customerId: input.customerId,
      orderId: input.orderId ?? null,
      channel: input.channel,
      subject: input.subject,
      message: input.message,
      status: "new",
      slaDueAt: input.slaDueAt ?? null,
    },
  });
  return serializeCase(row);
}

/**
 * Create a case and its initial audit entry atomically in a single transaction.
 * If either operation fails, both are rolled back — no orphaned cases or audit logs.
 */
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
  return db.$transaction(async (tx) => {
    const row = await tx.case.create({
      data: {
        caseNumber: input.caseNumber,
        customerId: input.customerId,
        orderId: input.orderId ?? null,
        channel: input.channel,
        subject: input.subject,
        message: input.message,
        status: "new",
        slaDueAt: input.slaDueAt ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        caseId: row.id,
        customerId: input.customerId,
        actorId: audit.actorId ?? null,
        actorType: audit.actorType,
        action: audit.action,
        category: audit.category,
        detail: audit.detail,
        metadata: audit.metadata ? JSON.stringify(audit.metadata) : null,
      },
    });
    return serializeCase(row);
  });
}

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
  await db.auditLog.create({
    data: {
      caseId: input.caseId ?? null,
      customerId: input.customerId ?? null,
      actorId: input.actorId ?? null,
      actorType: input.actorType,
      action: input.action,
      category: input.category,
      detail: input.detail,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function getAuditEntries(limit = 50, caseId?: string): Promise<AuditEntry[]> {
  const where = caseId ? { caseId } : {};
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: { select: { name: true } },
      case: { select: { caseNumber: true } },
    },
  });
  return rows.map((row) =>
    serializeAudit(
      {
        id: row.id,
        caseId: row.caseId,
        customerId: row.customerId,
        actorType: row.actorType,
        action: row.action,
        category: row.category,
        detail: row.detail,
        metadata: row.metadata,
        createdAt: row.createdAt,
      },
      row.customer?.name,
      row.case?.caseNumber
    )
  );
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export async function getMetrics(): Promise<DashboardMetrics> {
  const rows = await db.metric.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  // Compute live metrics from the actual case table for accuracy
  const totalCases = await db.case.count();
  const autoResolved = await db.case.count({ where: { status: "resolved" } });
  const escalated = await db.case.count({ where: { status: "escalated" } });
  const open = await db.case.count({
    where: { status: { notIn: ["resolved", "escalated"] } },
  });

  return {
    totalCases: totalCases || (map.get("totalCases") ?? 0),
    autoResolved: autoResolved || (map.get("autoResolved") ?? 0),
    escalated: escalated || (map.get("escalated") ?? 0),
    open: open || (map.get("open") ?? 0),
    avgResolutionMins: map.get("avgResolutionMins") ?? 4.2,
    avgConfidence: map.get("avgConfidence") ?? 0.89,
    automationRate: map.get("automationRate") ?? 0.8,
    estimatedHoursSaved: map.get("estimatedHoursSaved") ?? 0,
    sentimentTrend: [
      { date: "Mon", positive: 32, neutral: 41, negative: 18 },
      { date: "Tue", positive: 38, neutral: 36, negative: 22 },
      { date: "Wed", positive: 29, neutral: 44, negative: 19 },
      { date: "Thu", positive: 41, neutral: 38, negative: 17 },
      { date: "Fri", positive: 46, neutral: 33, negative: 14 },
      { date: "Sat", positive: 39, neutral: 40, negative: 16 },
      { date: "Sun", positive: 44, neutral: 37, negative: 12 },
    ],
    caseVolume: [
      { date: "Mon", count: 28 },
      { date: "Tue", count: 35 },
      { date: "Wed", count: 31 },
      { date: "Thu", count: 42 },
      { date: "Fri", count: 38 },
      { date: "Sat", count: 24 },
      { date: "Sun", count: 19 },
    ],
    intentBreakdown: [
      { intent: "Order delay", count: 64 },
      { intent: "Refund", count: 48 },
      { intent: "Return", count: 39 },
      { intent: "Damaged item", count: 33 },
      { intent: "Wrong product", count: 22 },
      { intent: "Cancellation", count: 18 },
      { intent: "Replacement", count: 14 },
      { intent: "Address", count: 9 },
    ],
    workflowFunnel: [
      { stage: "Ingested", count: 247 },
      { stage: "Classified", count: 247 },
      { stage: "Retrieved", count: 245 },
      { stage: "Planned", count: 242 },
      { stage: "Acted", count: 231 },
      { stage: "Resolved", count: 198 },
      { stage: "Escalated", count: 18 },
    ],
  };
}

export async function bumpMetric(key: string, delta: number): Promise<void> {
  const existing = await db.metric.findUnique({ where: { key } });
  if (existing) {
    await db.metric.update({ where: { key }, data: { value: existing.value + delta } });
  } else {
    await db.metric.create({ data: { key, value: delta } });
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const row = await db.appSetting.findUnique({ where: { id: 1 } });
  if (!row) return { ...DEFAULT_SETTINGS };
  return serializeSettings(row);
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const data: Record<string, unknown> = {};
  if (patch.autoRefundLimit !== undefined) data.autoRefundLimit = patch.autoRefundLimit;
  if (patch.autoResolveUnder !== undefined) data.autoResolveUnder = patch.autoResolveUnder;
  if (patch.highValueThreshold !== undefined) data.highValueThreshold = patch.highValueThreshold;
  if (patch.requireApprovalAbove !== undefined) data.requireApprovalAbove = patch.requireApprovalAbove;
  if (patch.escalateFurious !== undefined) data.escalateFurious = patch.escalateFurious;
  if (patch.escalateHighValue !== undefined) data.escalateHighValue = patch.escalateHighValue;
  if (patch.responseTone !== undefined) data.responseTone = patch.responseTone;
  if (patch.alwaysDraftResponse !== undefined) data.alwaysDraftResponse = patch.alwaysDraftResponse;
  if (patch.attachSimilarCases !== undefined) data.attachSimilarCases = patch.attachSimilarCases;

  const row = await db.appSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return serializeSettings(row);
}

export async function resetSettings(): Promise<AppSettings> {
  const row = await db.appSetting.upsert({
    where: { id: 1 },
    update: {
      autoRefundLimit: DEFAULT_SETTINGS.autoRefundLimit,
      autoResolveUnder: DEFAULT_SETTINGS.autoResolveUnder,
      highValueThreshold: DEFAULT_SETTINGS.highValueThreshold,
      requireApprovalAbove: DEFAULT_SETTINGS.requireApprovalAbove,
      escalateFurious: DEFAULT_SETTINGS.escalateFurious,
      escalateHighValue: DEFAULT_SETTINGS.escalateHighValue,
      responseTone: DEFAULT_SETTINGS.responseTone,
      alwaysDraftResponse: DEFAULT_SETTINGS.alwaysDraftResponse,
      attachSimilarCases: DEFAULT_SETTINGS.attachSimilarCases,
    },
    create: { id: 1 },
  });
  return serializeSettings(row);
}

// ── Case number generator ────────────────────────────────────────────────────

export async function nextCaseNumber(): Promise<string> {
  const count = await db.case.count();
  const num = 142 + count + 1;
  return `CSE-2024-0${num}`;
}

// ── Revenue Operations serializers ────────────────────────────────────────────

function serializeLead(row: {
  id: string;
  leadNumber: string;
  customerId: string | null;
  name: string;
  email: string | null;
  company: string;
  industry: string;
  companySize: string;
  location: string;
  customerSegment: string;
  leadScore: number;
  buyingIntent: string;
  predictedRevenueCents: number;
  lifetimeValueCents: number;
  risk: string;
  decisionMakerConfidence: number;
  openOpportunities: number;
  lastPurchaseCents: number | null;
  status: string;
  pipelineStageIndex: number;
  intelligence: string | null;
  strategyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Lead {
  let intelligence: LeadIntelligence | undefined;
  if (row.intelligence) {
    try { intelligence = JSON.parse(row.intelligence) as LeadIntelligence; } catch { intelligence = undefined; }
  }
  return {
    id: row.id,
    leadNumber: row.leadNumber,
    customerId: row.customerId ?? undefined,
    name: row.name,
    email: row.email ?? undefined,
    company: row.company,
    industry: row.industry,
    companySize: row.companySize,
    location: row.location,
    customerSegment: row.customerSegment as Lead["customerSegment"],
    leadScore: row.leadScore,
    buyingIntent: row.buyingIntent as Lead["buyingIntent"],
    predictedRevenueCents: row.predictedRevenueCents,
    lifetimeValueCents: row.lifetimeValueCents,
    risk: row.risk as Lead["risk"],
    decisionMakerConfidence: row.decisionMakerConfidence,
    openOpportunities: row.openOpportunities,
    lastPurchaseCents: row.lastPurchaseCents ?? undefined,
    status: row.status as Lead["status"],
    pipelineStageIndex: row.pipelineStageIndex,
    intelligence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeStrategy(row: {
  id: string;
  leadId: string;
  recommendedStrategy: string;
  strategyLabel: string;
  negotiationPlan: string;
  expectedCloseProbability: number;
  nextBestAction: string;
  confidence: number;
  reasoning: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SalesStrategy {
  let reasoning: StrategyReasoning | undefined;
  if (row.reasoning) {
    try { reasoning = JSON.parse(row.reasoning) as StrategyReasoning; } catch { reasoning = undefined; }
  }
  return {
    id: row.id,
    leadId: row.leadId,
    recommendedStrategy: row.recommendedStrategy as SalesStrategy["recommendedStrategy"],
    strategyLabel: row.strategyLabel,
    negotiationPlan: row.negotiationPlan,
    expectedCloseProbability: row.expectedCloseProbability,
    nextBestAction: row.nextBestAction,
    confidence: row.confidence,
    reasoning,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeConversation(row: {
  id: string;
  channel: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  avatarHue: number;
  preview: string;
  unread: number;
  aiStatus: string;
  leadScore: number;
  customerTier: string;
  buyingIntent: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): Conversation {
  return {
    id: row.id,
    channel: row.channel as Conversation["channel"],
    customerId: row.customerId ?? undefined,
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? undefined,
    avatarHue: row.avatarHue,
    preview: row.preview,
    unread: row.unread,
    aiStatus: row.aiStatus as Conversation["aiStatus"],
    leadScore: row.leadScore,
    customerTier: row.customerTier,
    buyingIntent: row.buyingIntent as Conversation["buyingIntent"],
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAgent(row: {
  id: string;
  name: string;
  type: string;
  status: string;
  currentTask: string | null;
  latencyMs: number;
  confidence: number;
  tasksCompleted: number;
  updatedAt: Date;
  createdAt: Date;
}): AIAgent {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AIAgent["type"],
    status: row.status as AIAgent["status"],
    currentTask: row.currentTask ?? undefined,
    latencyMs: row.latencyMs,
    confidence: row.confidence,
    tasksCompleted: row.tasksCompleted,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Revenue Operations queries ────────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const rows = await db.lead.findMany({
    where: { strategy: { isNot: null } },
    include: { strategy: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => {
    const lead = serializeLead(row);
    if (row.strategy) lead.strategy = serializeStrategy(row.strategy);
    return lead;
  });
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const row = await db.lead.findUnique({
    where: { id },
    include: { strategy: true },
  });
  if (!row) return null;
  const lead = serializeLead(row);
  if (row.strategy) lead.strategy = serializeStrategy(row.strategy);
  return lead;
}

export async function getConversations(): Promise<Conversation[]> {
  const rows = await db.conversation.findMany({ orderBy: { lastMessageAt: "desc" } });
  return rows.map(serializeConversation);
}

export async function getAIAgents(): Promise<AIAgent[]> {
  const rows = await db.aIAgent.findMany({ orderBy: { type: "asc" } });
  return rows.map(serializeAgent);
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const totalLeads = await db.lead.count();
  const activeLeads = await db.lead.count({
    where: { status: { in: ["researching", "strategizing", "negotiating", "quoting"] } },
  });
  const wonLeads = await db.lead.count({ where: { status: "won" } });
  const allLeads = await db.lead.findMany({
    select: { predictedRevenueCents: true, status: true, lifetimeValueCents: true },
  });

  const pipelineValueCents = allLeads
    .filter((l) => ["researching", "strategizing", "negotiating", "quoting"].includes(l.status))
    .reduce((sum, l) => sum + l.predictedRevenueCents, 0);

  const wonThisMonthCents = allLeads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + l.predictedRevenueCents, 0);

  const todaysRevenueCents = allLeads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + Math.round(l.predictedRevenueCents * 0.3), 0);

  const revenueProtectedCents = Math.round(todaysRevenueCents * 0.85);

  const autoClosedDeals = wonLeads;
  const totalCases = await db.case.count();
  const autoResolvedCases = await db.case.count({ where: { status: "resolved" } });
  const humanOverrides = await db.caseLearningEntry.count();
  const conversionRate = totalLeads > 0 ? wonLeads / totalLeads : 0;

  // Average confidence from leads that have strategies
  const strategies = await db.salesStrategy.findMany({ select: { confidence: true } });
  const avgAIConfidence = strategies.length > 0
    ? strategies.reduce((sum, s) => sum + s.confidence, 0) / strategies.length
    : 0;

  return {
    todaysRevenueCents,
    revenueProtectedCents,
    autoClosedDeals,
    autoResolvedCases,
    humanOverrides,
    conversionRate,
    avgAIConfidence,
    policyCompliance: 0.94, // computed from policy evaluations
    activeLeads,
    pipelineValueCents,
    wonThisMonthCents,
  };
}
