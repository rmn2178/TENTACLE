"use server";

import { mockCases, mockCustomers, mockOrders, mockPolicies, mockAuditEntries, mockDashboardMetrics } from "@/lib/data/mockData";
import type { CaseRecord, Customer, Order, Policy, AuditEntry, DashboardMetrics } from "@/types";

// In-memory data store. Persists for the lifetime of the server process.
// In a real deployment this would be backed by Prisma + Postgres.

type Store = {
  cases: CaseRecord[];
  customers: Customer[];
  orders: Order[];
  policies: Policy[];
  audit: AuditEntry[];
  metrics: DashboardMetrics;
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

// ── Mutators ────────────────────────────────────────────────────────────────

export function upsertCase(c: CaseRecord): void {
  const store = getStore();
  const idx = store.cases.findIndex((x) => x.id === c.id);
  if (idx >= 0) store.cases[idx] = c;
  else store.cases.unshift(c);
}

export function appendAudit(entry: AuditEntry): void {
  const store = getStore();
  store.audit.unshift(entry);
  // Keep audit log bounded
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
    store.metrics[key] = current + delta;
  }
}

let caseCounter = 150;
export function nextCaseNumber(): string {
  caseCounter += 1;
  return `CSE-2024-0${caseCounter}`;
}
