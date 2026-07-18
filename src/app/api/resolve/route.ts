import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCaseById,
  getCustomerById,
  updateCase,
  appendAudit,
  bumpMetric,
} from "@/lib/db/queries";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/session";

export const runtime = "nodejs";

const schema = z.object({
  caseId: z.string().min(1),
  note: z.string().max(2000).optional(),
  agentName: z.string().max(100).optional(),
});

// Mark a case as manually resolved by an agent.
// Requires manager role or higher — agents cannot self-resolve escalated cases.
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireRole("manager" as UserRole);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { caseId, note } = parsed.data;

  const c = await getCaseById(caseId);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(c.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const updated = await updateCase(c.id, {
    status: "resolved",
    resolvedAt: new Date(),
    assignedAgentId: user.id,
  });

  await bumpMetric("autoResolved", 1);

  await appendAudit({
    caseId: c.id,
    customerId: customer.id,
    actorId: user.id,
    actorType: "agent",
    action: "case.resolve_manual",
    category: "state",
    detail: `Case manually resolved by ${user.name}.${note ? ` Note: ${note}` : ""}`,
    metadata: { manual: true, note },
  });

  return NextResponse.json({ case: updated });
}
