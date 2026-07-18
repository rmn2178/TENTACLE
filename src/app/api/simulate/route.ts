import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getCaseById, getCustomerById, getOrderById } from "@/lib/db/queries";
import { simulateBusinessImpact } from "@/lib/ai/simulator";

export const runtime = "nodejs";

const schema = z.object({
  caseId: z.string().min(1),
  action: z.string().min(1),
});

// POST — simulate the business impact of an action before execution
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
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

  const { caseId, action } = parsed.data;
  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const customer = await getCustomerById(caseRecord.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const order = caseRecord.orderId ? await getOrderById(caseRecord.orderId) : undefined;
  const simulation = await simulateBusinessImpact(caseRecord, customer, order, caseRecord.resolutionPlan, action);

  return NextResponse.json({ simulation });
}
