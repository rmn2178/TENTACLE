import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/session";
import { getStore, resetStore } from "@/lib/data/store";
import { getMetrics } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireRole("admin" as UserRole);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  // Reset cases and audit only — preserve customers, orders, policies, settings
  const store = getStore();
  store.cases = [];
  store.audit = [];

  const metrics = await getMetrics();

  return NextResponse.json({
    cases: store.cases,
    customers: store.customers,
    orders: store.orders,
    policies: store.policies,
    audit: store.audit,
    metrics,
  });
}
