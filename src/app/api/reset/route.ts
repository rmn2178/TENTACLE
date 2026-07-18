import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCases, getCustomers, getOrders, getPolicies, getAuditEntries, getMetrics } from "@/lib/db/queries";

export const runtime = "nodejs";

// Reset demo data — requires admin role. Clears cases and audit logs only;
// customers, orders, policies, users, and settings are preserved.
// To fully re-seed, run `bun run db:seed` from the terminal.
export async function POST() {
  try {
    await requireRole("admin" as UserRole);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  await db.auditLog.deleteMany();
  await db.case.deleteMany();

  const [cases, customers, orders, policies, audit, metrics] = await Promise.all([
    getCases(),
    getCustomers(),
    getOrders(),
    getPolicies(),
    getAuditEntries(50),
    getMetrics(),
  ]);

  return NextResponse.json({
    cases,
    customers,
    orders,
    policies,
    audit,
    metrics,
  });
}
