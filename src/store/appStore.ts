"use client";

import { create } from "zustand";
import type { CaseRecord, Customer, Order, Policy, AuditEntry, DashboardMetrics } from "@/types";
import type { AppSettings } from "@/types/settings";
import type { LearningEntry } from "@/types/learning";
import type { Lead, Conversation, AIAgent, RevenueMetrics } from "@/types/revenue";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { mockLeads, mockConversations, mockAIAgents, mockRevenueMetrics } from "@/lib/data/revenueData";

export type ViewKey =
  | "dashboard"
  | "inbox"
  | "case"
  | "escalations"
  | "ledger"
  | "audit"
  | "settings"
  | "intake"
  | "revenue";

interface AppState {
  // Navigation
  view: ViewKey;
  selectedCaseId: string | null;
  selectedLeadId: string | null;
  setView: (v: ViewKey) => void;
  openCase: (id: string) => void;
  openLead: (id: string) => void;

  // Core data
  cases: CaseRecord[];
  customers: Customer[];
  orders: Order[];
  policies: Policy[];
  audit: AuditEntry[];
  metrics: DashboardMetrics;
  learningEntries: LearningEntry[];
  hydrated: boolean;
  setData: (d: {
    cases: CaseRecord[];
    customers: Customer[];
    orders: Order[];
    policies: Policy[];
    audit: AuditEntry[];
    metrics: DashboardMetrics;
    learningEntries?: LearningEntry[];
  }) => void;
  upsertCaseLocal: (c: CaseRecord) => void;
  setAudit: (a: AuditEntry[]) => void;
  prependAudit: (a: AuditEntry) => void;
  setLearningEntries: (entries: LearningEntry[]) => void;
  prependLearningEntry: (entry: LearningEntry) => void;
  setMetrics: (m: DashboardMetrics) => void;
  resetData: () => void;

  // Settings
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Inbox filters
  filterStatus: string;
  filterUrgency: string;
  filterIntent: string;
  searchQuery: string;
  setFilterStatus: (s: string) => void;
  setFilterUrgency: (u: string) => void;
  setFilterIntent: (i: string) => void;
  setSearchQuery: (q: string) => void;

  // Processing state
  processingStage: string | null;
  setProcessingStage: (s: string | null) => void;

  // Mobile nav
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // ── Revenue Agent slice ───────────────────────────────────────────────────
  leads: Lead[];
  conversations: Conversation[];
  aiAgents: AIAgent[];
  revenueMetrics: RevenueMetrics;
  setLeads: (leads: Lead[]) => void;
  upsertLead: (lead: Lead) => void;
  setConversations: (convs: Conversation[]) => void;
  setAIAgents: (agents: AIAgent[]) => void;
  updateAIAgent: (id: string, patch: Partial<AIAgent>) => void;
  setRevenueMetrics: (m: RevenueMetrics) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  selectedCaseId: null,
  selectedLeadId: null,
  setView: (v) => set({ view: v, mobileNavOpen: false }),
  openCase: (id) => set({ view: "case", selectedCaseId: id, mobileNavOpen: false }),
  openLead: (id) => set({ selectedLeadId: id, mobileNavOpen: false }),

  cases: [],
  customers: [],
  orders: [],
  policies: [],
  audit: [],
  learningEntries: [],
  metrics: {
    totalCases: 0,
    autoResolved: 0,
    escalated: 0,
    open: 0,
    avgResolutionMins: 0,
    avgConfidence: 0,
    automationRate: 0,
    estimatedHoursSaved: 0,
    sentimentTrend: [],
    caseVolume: [],
    intentBreakdown: [],
    workflowFunnel: [],
  },
  hydrated: false,
  setData: (d) =>
    set({
      cases: d.cases,
      customers: d.customers,
      orders: d.orders,
      policies: d.policies,
      audit: d.audit,
      metrics: d.metrics,
      learningEntries: d.learningEntries ?? [],
      hydrated: true,
    }),
  upsertCaseLocal: (c) =>
    set((state) => {
      const idx = state.cases.findIndex((x) => x.id === c.id);
      const next = [...state.cases];
      if (idx >= 0) next[idx] = c;
      else next.unshift(c);
      return { cases: next };
    }),
  setAudit: (a) => set({ audit: a }),
  prependAudit: (entry) =>
    set((state) => ({ audit: [entry, ...state.audit].slice(0, 500) })),
  setLearningEntries: (entries) => set({ learningEntries: entries }),
  prependLearningEntry: (entry) =>
    set((state) => ({ learningEntries: [entry, ...state.learningEntries].slice(0, 100) })),
  setMetrics: (m) => set({ metrics: m }),
  resetData: () => set({ hydrated: false }),

  settings: { ...DEFAULT_SETTINGS },
  setSettings: (s) => set({ settings: s }),
  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  filterStatus: "all",
  filterUrgency: "all",
  filterIntent: "all",
  searchQuery: "",
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterUrgency: (u) => set({ filterUrgency: u }),
  setFilterIntent: (i) => set({ filterIntent: i }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  processingStage: null,
  setProcessingStage: (s) => set({ processingStage: s }),

  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Revenue Agent slice
  leads: mockLeads,
  conversations: mockConversations,
  aiAgents: mockAIAgents,
  revenueMetrics: mockRevenueMetrics,
  setLeads: (leads) => set({ leads }),
  upsertLead: (lead) =>
    set((state) => {
      const idx = state.leads.findIndex((l) => l.id === lead.id);
      const next = [...state.leads];
      if (idx >= 0) next[idx] = lead;
      else next.unshift(lead);
      return { leads: next };
    }),
  setConversations: (conversations) => set({ conversations }),
  setAIAgents: (aiAgents) => set({ aiAgents }),
  updateAIAgent: (id, patch) =>
    set((state) => ({
      aiAgents: state.aiAgents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  setRevenueMetrics: (revenueMetrics) => set({ revenueMetrics }),
}));
