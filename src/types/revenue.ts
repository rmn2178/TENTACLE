// Revenue Operations types — the autonomous sales layer.
// Leads flow through an autonomous sales pipeline; each lead carries computed
// intelligence and an AI-authored sales strategy. Mirrors the Case/AIClassification
// type style: serializable, JSON-friendly, used by both DB serialization and UI.

export type BuyingIntent = "cold" | "warm" | "hot" | "buying";

export type LeadRisk = "low" | "medium" | "high";

export type CustomerSegment = "smb" | "mid_market" | "enterprise" | "strategic";

export type LeadStatus =
  | "researching"
  | "strategizing"
  | "negotiating"
  | "quoting"
  | "won"
  | "lost"
  | "nurtured";

export type StrategyType =
  | "discovery"
  | "upsell"
  | "cross_sell"
  | "discount"
  | "premium_offer"
  | "enterprise_plan";

export type OmniChannel = "whatsapp" | "instagram" | "website_chat" | "email" | "messenger";

export type AIAgentType =
  | "support"
  | "revenue"
  | "research"
  | "policy"
  | "risk"
  | "finance"
  | "compliance"
  | "learning"
  | "execution";

export type AIAgentStatus = "active" | "idle" | "thinking" | "processing" | "paused";

export type ConversationAIStatus = "handled" | "active" | "escalated" | "idle";

// ── Lead ──────────────────────────────────────────────────────────────────────

export interface LeadIntelligence {
  buyingIntent: BuyingIntent;
  risk: LeadRisk;
  decisionMakerConfidence: number; // 0..1
  customerSegment: CustomerSegment;
  industry: string;
  companySize: string;
  location: string;
  openOpportunities: number;
  lastPurchaseCents?: number;
  previousConversations: number;
  signals: Array<{ label: string; weight: number; detail: string }>;
}

export interface Lead {
  id: string;
  leadNumber: string;
  customerId?: string;
  name: string;
  email?: string;
  company: string;
  industry: string;
  companySize: string;
  location: string;
  customerSegment: CustomerSegment;
  leadScore: number; // 0..1
  buyingIntent: BuyingIntent;
  predictedRevenueCents: number;
  lifetimeValueCents: number;
  risk: LeadRisk;
  decisionMakerConfidence: number; // 0..1
  openOpportunities: number;
  lastPurchaseCents?: number;
  status: LeadStatus;
  pipelineStageIndex: number;
  intelligence?: LeadIntelligence;
  strategy?: SalesStrategy;
  createdAt: string;
  updatedAt: string;
}

// ── Sales strategy ────────────────────────────────────────────────────────────

export interface StrategyReasoning {
  whyThisStrategy: string;
  topDrivers: Array<{ driver: string; weight: number; detail: string }>;
  alternativesConsidered: Array<{ strategy: StrategyType; label: string; closeProbability: number }>;
  rejectedStrategies: Array<{ strategy: StrategyType; label: string; reason: string }>;
  businessFactors: Array<{ factor: string; impact: string }>;
  learningInfluence?: string;
}

export interface SalesStrategy {
  id: string;
  leadId: string;
  recommendedStrategy: StrategyType;
  strategyLabel: string;
  negotiationPlan: string;
  expectedCloseProbability: number; // 0..1
  nextBestAction: string;
  confidence: number; // 0..1
  reasoning?: StrategyReasoning;
  createdAt: string;
  updatedAt: string;
}

// ── Omnichannel conversation ──────────────────────────────────────────────────

export interface Conversation {
  id: string;
  channel: OmniChannel;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  avatarHue: number;
  preview: string;
  unread: number;
  aiStatus: ConversationAIStatus;
  leadScore: number; // 0..1
  customerTier: string; // standard | silver | gold | platinum
  buyingIntent: BuyingIntent;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── AI workforce ──────────────────────────────────────────────────────────────

export interface AIAgent {
  id: string;
  name: string;
  type: AIAgentType;
  status: AIAgentStatus;
  currentTask?: string;
  latencyMs: number;
  confidence: number; // 0..1
  tasksCompleted: number;
  updatedAt: string;
}

// ── Live pipeline ─────────────────────────────────────────────────────────────

export interface PipelineStage {
  key: string;
  label: string;
  description: string;
}

// The 13-step autonomous sales pipeline every lead flows through.
export const REVENUE_PIPELINE: PipelineStage[] = [
  { key: "receive", label: "Receive Lead", description: "Inbound lead captured from omnichannel sources" },
  { key: "research", label: "Research Customer", description: "Enrich firmographics, industry, and buying history" },
  { key: "crm", label: "Retrieve CRM History", description: "Pull prior orders, tickets, and account standing" },
  { key: "memory", label: "Retrieve Memory", description: "Recall previous conversations and commitments" },
  { key: "analyze", label: "Analyze Buying Behaviour", description: "Score intent, cadence, and engagement signals" },
  { key: "ltv", label: "Predict Lifetime Value", description: "Forecast long-term revenue from this account" },
  { key: "probability", label: "Predict Purchase Probability", description: "Estimate likelihood to close in-cycle" },
  { key: "strategy", label: "Choose Selling Strategy", description: "Select discovery, upsell, or enterprise plan" },
  { key: "negotiate", label: "Negotiate", description: "Propose terms anchored on value and risk" },
  { key: "quote", label: "Create Quote", description: "Generate itemized quote with margin guardrails" },
  { key: "meeting", label: "Book Meeting", description: "Schedule follow-up with the decision maker" },
  { key: "invoice", label: "Generate Invoice", description: "Issue invoice and initiate payment collection" },
  { key: "learn", label: "Learn from Outcome", description: "Fold result into organizational memory" },
];

// ── Revenue impact simulation ─────────────────────────────────────────────────

export interface RevenueImpactSimulation {
  strategy: StrategyType;
  strategyLabel: string;
  expectedRevenueCents: number;
  expectedRevenueFormatted: string;
  profitMarginPct: number;
  profitMarginFormatted: string;
  profitCents: number;
  profitFormatted: string;
  retentionImpact: number; // 0..1 — probability the account is retained
  retentionImpactPct: string;
  discountCostCents: number;
  discountCostFormatted: string;
  lifetimeValueCents: number;
  lifetimeValueFormatted: string;
  riskScore: number; // 0..100
  riskLevel: LeadRisk;
  riskFactors: string[];
  roi: number; // return multiple, e.g. 3.2x
  roiFormatted: string;
  revenueSavedCents: number;
  revenueSavedFormatted: string;
  projectedGrowthPct: number;
  closeProbability: number; // 0..1
  alternatives: Array<{
    strategy: StrategyType;
    label: string;
    expectedRevenueCents: number;
    closeProbability: number;
    roi: number;
    recommended: boolean;
  }>;
  recommendation: "pursue" | "negotiate" | "defer";
  recommendationReason: string;
}

// ── Revenue Agent run result ───────────────────────────────────────────────────

export interface RevenueAgentRunResult {
  lead: Lead;
  strategy: SalesStrategy;
  impact: RevenueImpactSimulation;
  pipeline: PipelineStage[];
  trace: Array<{ stage: string; durationMs: number; status: "ok" }>;
}

// ── Executive metrics ─────────────────────────────────────────────────────────

export interface RevenueMetrics {
  todaysRevenueCents: number;
  revenueProtectedCents: number;
  autoClosedDeals: number;
  autoResolvedCases: number;
  humanOverrides: number;
  conversionRate: number; // 0..1
  avgAIConfidence: number; // 0..1
  policyCompliance: number; // 0..1
  activeLeads: number;
  pipelineValueCents: number;
  wonThisMonthCents: number;
}
