// Core domain types for the Autonomous Tentacle

export type Channel = "chat" | "email" | "whatsapp";

export type CaseStatus =
  | "new"
  | "classified"
  | "retrieved"
  | "planned"
  | "acted"
  | "resolved"
  | "escalated";

export type Intent =
  | "order_delay"
  | "damaged_item"
  | "wrong_product"
  | "refund_request"
  | "replacement_request"
  | "cancellation_request"
  | "address_correction"
  | "return_eligibility"
  | "general_inquiry"
  | "escalation";

export type Sentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "frustrated"
  | "furious";

export type Urgency = "low" | "medium" | "high" | "critical";

export type CustomerTier = "standard" | "silver" | "gold" | "platinum";

export type OrderStatus =
  | "placed"
  | "shipped"
  | "delivered"
  | "delayed"
  | "cancelled"
  | "returned";

export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  priceCents: number;
  imageHue?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarHue: number;
  tier: CustomerTier;
  lifetimeValue: number;
  orderCount: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCents: number;
  currency: string;
  placedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  eta?: string;
  shippingAddress: string;
}

export interface PolicyRule {
  field: string;
  op: "lte" | "gte" | "eq" | "within" | "is";
  value: string | number;
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  rules: PolicyRule[];
  autoResolve: boolean;
  weight: number;
}

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  action: string; // refund | replacement | cancel | address_update | escalate | send_response | schedule_callback
  status: "pending" | "executed" | "skipped" | "failed";
  safeToAuto: boolean;
  executedAt?: string;
  result?: string;
}

export interface RetrievalHit {
  id: string;
  source: "policy" | "customer_history" | "order" | "similar_case";
  title: string;
  snippet: string;
  relevance: number; // 0..1
  meta?: Record<string, string>;
}

export interface ResolutionPlan {
  goal: string;
  approach: string;
  workflowSteps: WorkflowStep[];
  estimatedResolutionMins: number;
  customerImpact: string;
  risksIdentified: string[];
}

export interface AIClassification {
  intent: Intent;
  sentiment: Sentiment;
  sentimentScore: number;
  urgency: Urgency;
  confidence: number;
  automationSafe: boolean;
  neededContext: string[];
  explanation: string;
  keywords: string[];
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  customerId: string;
  orderId?: string;
  channel: Channel;
  subject: string;
  message: string;
  intent?: Intent;
  sentiment?: Sentiment;
  sentimentScore?: number;
  urgency?: Urgency;
  confidence?: number;
  automationSafe?: boolean;
  status: CaseStatus;
  resolutionPlan?: ResolutionPlan;
  responseDraft?: string;
  workflowSteps?: WorkflowStep[];
  escalationReason?: string;
  assignedAgent?: string;
  slaDueAt?: string;
  resolvedAt?: string;
  retrievalHits?: RetrievalHit[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  caseId?: string;
  caseNumber?: string;
  customerId?: string;
  customerName?: string;
  actor: "system" | "agent" | "ai";
  action: string;
  category:
    | "intake"
    | "classification"
    | "retrieval"
    | "planning"
    | "action"
    | "escalation"
    | "state";
  detail: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardMetrics {
  totalCases: number;
  autoResolved: number;
  escalated: number;
  open: number;
  avgResolutionMins: number;
  avgConfidence: number;
  automationRate: number;
  estimatedHoursSaved: number;
  sentimentTrend: { date: string; positive: number; neutral: number; negative: number }[];
  caseVolume: { date: string; count: number }[];
  intentBreakdown: { intent: string; count: number }[];
  workflowFunnel: { stage: string; count: number }[];
}
