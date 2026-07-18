import "server-only";
import {
  mockCases,
  mockCustomers,
  mockOrders,
  mockPolicies,
  mockAuditEntries,
  mockDashboardMetrics,
} from "@/lib/data/mockData";
import type {
  CaseRecord,
  Customer,
  Order,
  Policy,
  AuditEntry,
  DashboardMetrics,
} from "@/types";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { LearningEntry } from "@/types/learning";
import { createHash } from "crypto";

// ── Users (demo, in-memory) ──────────────────────────────────────────────────

function hashPassword(password: string): string {
  return createHash("sha256").update("tentacle-demo-salt" + password).digest("hex");
}

export interface StoreUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  avatarHue: number;
}

const DEMO_USERS: StoreUser[] = [
  { id: "usr_01", email: "avery@marigold.co", name: "Avery Kim", passwordHash: hashPassword("demo1234"), role: "agent", avatarHue: 160 },
  { id: "usr_02", email: "bennett@marigold.co", name: "Bennett Cho", passwordHash: hashPassword("demo1234"), role: "manager", avatarHue: 24 },
  { id: "usr_03", email: "admin@marigold.co", name: "Admin User", passwordHash: hashPassword("admin1234"), role: "admin", avatarHue: 280 },
];

export function getUserByEmail(email: string): StoreUser | undefined {
  return DEMO_USERS.find((u) => u.email === email.toLowerCase());
}

// ── Store type ───────────────────────────────────────────────────────────────

type Store = {
  cases: CaseRecord[];
  customers: Customer[];
  orders: Order[];
  policies: Policy[];
  audit: AuditEntry[];
  metrics: DashboardMetrics;
  settings: AppSettings;
  learning: LearningEntry[];
};

declare global {
  var __resolutionStore: Store | undefined;
}

function init(): Store {
  return {
    cases: structuredClone(mockCases),
    customers: structuredClone(mockCustomers),
    orders: structuredClone(mockOrders),
    policies: structuredClone(mockPolicies),
    audit: structuredClone(mockAuditEntries),
    metrics: structuredClone(mockDashboardMetrics),
    settings: { ...DEFAULT_SETTINGS },
    learning: [
      {
        id: "learn_01",
        caseId: "cas_h2",
        caseNumber: "CSE-2024-0132",
        customerId: "cus_05",
        customerName: "Marcus Bell",
        overrideType: "rejected_action",
        originalDecision: { action: "refund", confidence: 0.78, automationSafe: true },
        humanDecision: { action: "replacement", note: "Customer preferred replacement over refund" },
        context: { intent: "wrong_product", sentiment: "negative", urgency: "medium", orderTotalCents: 10100, policyCodes: ["WRONG-PRODUCT"] },
        feedbackNote: "The AI should check if the customer explicitly asks for a replacement before defaulting to refund.",
        createdBy: "usr_01",
        createdAt: new Date(Date.now() - 5 * 86400000 + 10 * 60000).toISOString(),
      },
      {
        id: "learn_02",
        caseId: "cas_h3",
        caseNumber: "CSE-2024-0133",
        customerId: "cus_02",
        customerName: "Daniel Okafor",
        overrideType: "edited_draft",
        originalDecision: { action: "refund", confidence: 0.88, automationSafe: true },
        humanDecision: { action: "refund", note: "Edited tone to be more empathetic" },
        context: { intent: "damaged_item", sentiment: "frustrated", urgency: "high", orderTotalCents: 14500, policyCodes: ["DAMAGE-FULL"] },
        feedbackNote: "The AI's draft was too transactional for a frustrated customer. Added empathy sentence.",
        createdBy: "usr_02",
        createdAt: new Date(Date.now() - 7 * 86400000 + 15 * 60000).toISOString(),
      },
      {
        id: "learn_03",
        caseId: "cas_h1",
        caseNumber: "CSE-2024-0131",
        customerId: "cus_01",
        customerName: "Amelia Hart",
        overrideType: "resolved_differently",
        originalDecision: { action: "send_response", confidence: 0.94, automationSafe: true },
        humanDecision: { action: "send_response", note: "Resolved with FAQ link instead of full response" },
        context: { intent: "return_eligibility", sentiment: "neutral", urgency: "low", orderTotalCents: 21900, policyCodes: ["RETURN-ELIG-90"] },
        feedbackNote: "For simple policy questions, a shorter response with a link works better than a full explanation.",
        createdBy: "usr_01",
        createdAt: new Date(Date.now() - 3 * 86400000 + 8 * 60000).toISOString(),
      },
    ],
  };
}

export function getStore(): Store {
  if (!globalThis.__resolutionStore) {
    globalThis.__resolutionStore = init();
  }
  return globalThis.__resolutionStore;
}

export function resetStore(): Store {
  globalThis.__resolutionStore = init();
  return globalThis.__resolutionStore;
}

// ── Case mutators ────────────────────────────────────────────────────────────

export function upsertCase(c: CaseRecord): void {
  const store = getStore();
  const idx = store.cases.findIndex((x) => x.id === c.id);
  if (idx >= 0) store.cases[idx] = c;
  else store.cases.unshift(c);
}

export function appendAudit(entry: AuditEntry): void {
  const store = getStore();
  store.audit.unshift(entry);
  if (store.audit.length > 500) store.audit.length = 500;
}

const NUMERIC_METRIC_KEYS = [
  "totalCases",
  "autoResolved",
  "escalated",
  "open",
  "estimatedHoursSaved",
] as const;

type NumericMetricKey = (typeof NUMERIC_METRIC_KEYS)[number];

export function bumpMetrics(key: NumericMetricKey, delta: number): void {
  const store = getStore();
  const current = store.metrics[key];
  if (typeof current === "number") {
    (store.metrics as unknown as Record<string, number>)[key] = current + delta;
  }
}

let caseCounter = 150;
export function nextCaseNumber(): string {
  caseCounter += 1;
  return `CSE-2024-0${caseCounter}`;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return getStore().settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const store = getStore();
  store.settings = { ...store.settings, ...patch };
  return store.settings;
}

export function resetSettings(): AppSettings {
  const store = getStore();
  store.settings = { ...DEFAULT_SETTINGS };
  return store.settings;
}

// ── Learning entries ──────────────────────────────────────────────────────────

export function getLearningEntries(limit = 50): LearningEntry[] {
  return getStore().learning.slice(0, limit);
}

export function getLearningEntriesForCase(caseId: string): LearningEntry[] {
  return getStore().learning.filter((e) => e.caseId === caseId);
}

export function addLearningEntry(entry: LearningEntry): void {
  const store = getStore();
  store.learning.unshift(entry);
  if (store.learning.length > 200) store.learning.length = 200;
}
