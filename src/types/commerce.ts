// Commerce types for the SMB Revenue Agent — product selling, not enterprise CRM.

import type { OmniChannel } from "./revenue";

// ── Customer source card ───────────────────────────────────────────────────────

export type CommerceChannel = OmniChannel | "returning" | "abandoned";

export interface CustomerSource {
  id: string;
  label: string;
  channel: CommerceChannel;
  count: number;      // live customers from this source
  unread: number;     // unread messages
  conversionPct: number; // historical conversion % for this channel
}

// ── Customer journey stage ─────────────────────────────────────────────────────

export interface JourneyStage {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
}

// ── AI product recommendation ──────────────────────────────────────────────────

export interface CommerceRecommendation {
  title: string;
  confidence: number;    // 0-100
  reason: string;
  expectedSaleCents: number;
  products: string[];
}

// ── Buying signal ──────────────────────────────────────────────────────────────

export interface BuyingSignal {
  label: string;
  weight: number; // 0-1
}

// ── Customer status ────────────────────────────────────────────────────────────

export type CustomerQueueStatus =
  | "talking"
  | "thinking"
  | "recommendation_sent"
  | "checkout_pending"
  | "resolved"
  | "idle";

// ── Loyalty tier ───────────────────────────────────────────────────────────────

export type LoyaltyTier = "standard" | "silver" | "gold" | "platinum";

// ── Live commerce customer ─────────────────────────────────────────────────────

export interface CommerceCustomer {
  id: string;
  name: string;
  avatarHue: number;
  channel: CommerceChannel;
  intent: string;
  leadScore: number;           // 0-100
  orderValueCents: number;     // expected order value
  status: CustomerQueueStatus;
  isReturning: boolean;
  previousOrders: number;
  lifetimeValueCents: number;
  favoriteCategories: string[];
  recentPurchase?: string;
  abandonedCart?: string;
  preferredPayment?: string;
  loyaltyTier: LoyaltyTier;
  lastSeen: string;            // ISO
  buyingSignals: BuyingSignal[];
  journeyStages: JourneyStage[];
  aiRecommendation: CommerceRecommendation;
  updatedAt: string;
}

// ── Commerce AI agent ──────────────────────────────────────────────────────────

export type CommerceAgentStatus = "active" | "processing" | "thinking" | "idle";

export interface CommerceAgent {
  id: string;
  name: string;
  status: CommerceAgentStatus;
  task?: string;
  confidence: number; // 0-100
  latencyMs: number;
}

// ── Live activity item ─────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  text: string;
  timeAgo: string; // ISO
}
