import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { recordOverride, getLearningSignal, getAllLearningEntries, getLearningEntriesForCase } from "@/lib/ai/learning";
import type { OverrideType } from "@/types/learning";

export const runtime = "nodejs";

const recordSchema = z.object({
  caseId: z.string().min(1),
  overrideType: z.enum([
    "rejected_action",
    "edited_draft",
    "escalated_false_positive",
    "forced_action",
    "plan_modified",
    "resolved_differently",
  ]),
  originalDecision: z.object({
    action: z.string().optional(),
    planGoal: z.string().optional(),
    confidence: z.number().optional(),
    automationSafe: z.boolean().optional(),
  }),
  humanDecision: z.object({
    action: z.string().optional(),
    note: z.string().optional(),
  }),
  context: z.object({
    intent: z.string().optional(),
    sentiment: z.string().optional(),
    urgency: z.string().optional(),
    orderTotalCents: z.number().optional(),
    policyCodes: z.array(z.string()).optional(),
  }),
  feedbackNote: z.string().max(1000).optional(),
});

// GET — retrieve learning entries (all or for a specific case)
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");

  const entries = caseId
    ? await getLearningEntriesForCase(caseId)
    : await getAllLearningEntries(50);

  return NextResponse.json({ entries });
}

// POST — record a human override
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const entry = await recordOverride(parsed.data as { caseId: string; overrideType: OverrideType; originalDecision: Record<string, unknown>; humanDecision: Record<string, unknown>; context: Record<string, unknown>; feedbackNote?: string }, user.id);

  return NextResponse.json({ entry }, { status: 201 });
}
