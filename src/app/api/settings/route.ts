import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings, resetSettings } from "@/lib/db/queries";
import { requireAuth } from "@/lib/auth/session";
import { DEFAULT_SETTINGS, type AppSettings, type ResponseTone } from "@/types/settings";

export const runtime = "nodejs";

const VALID_TONES: ResponseTone[] = ["warm_professional", "concise", "apologetic"];

function validateSettings(body: unknown): { ok: true; settings: Partial<AppSettings> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const b = body as Record<string, unknown>;
  const out: Partial<AppSettings> = {};
  if (b.autoRefundLimit !== undefined) {
    if (typeof b.autoRefundLimit !== "number" || b.autoRefundLimit < 0 || b.autoRefundLimit > 10000)
      return { ok: false, error: "autoRefundLimit must be a number between 0 and 10000" };
    out.autoRefundLimit = b.autoRefundLimit;
  }
  if (b.autoResolveUnder !== undefined) {
    if (typeof b.autoResolveUnder !== "number" || b.autoResolveUnder < 0 || b.autoResolveUnder > 10000)
      return { ok: false, error: "autoResolveUnder must be a number between 0 and 10000" };
    out.autoResolveUnder = b.autoResolveUnder;
  }
  if (b.highValueThreshold !== undefined) {
    if (typeof b.highValueThreshold !== "number" || b.highValueThreshold < 0)
      return { ok: false, error: "highValueThreshold must be a positive number" };
    out.highValueThreshold = b.highValueThreshold;
  }
  if (b.requireApprovalAbove !== undefined) {
    if (typeof b.requireApprovalAbove !== "number" || b.requireApprovalAbove < 0)
      return { ok: false, error: "requireApprovalAbove must be a positive number" };
    out.requireApprovalAbove = b.requireApprovalAbove;
  }
  if (b.escalateFurious !== undefined) {
    if (typeof b.escalateFurious !== "boolean") return { ok: false, error: "escalateFurious must be boolean" };
    out.escalateFurious = b.escalateFurious;
  }
  if (b.escalateHighValue !== undefined) {
    if (typeof b.escalateHighValue !== "boolean") return { ok: false, error: "escalateHighValue must be boolean" };
    out.escalateHighValue = b.escalateHighValue;
  }
  if (b.alwaysDraftResponse !== undefined) {
    if (typeof b.alwaysDraftResponse !== "boolean") return { ok: false, error: "alwaysDraftResponse must be boolean" };
    out.alwaysDraftResponse = b.alwaysDraftResponse;
  }
  if (b.attachSimilarCases !== undefined) {
    if (typeof b.attachSimilarCases !== "boolean") return { ok: false, error: "attachSimilarCases must be boolean" };
    out.attachSimilarCases = b.attachSimilarCases;
  }
  if (b.responseTone !== undefined) {
    if (!VALID_TONES.includes(b.responseTone as ResponseTone))
      return { ok: false, error: `responseTone must be one of: ${VALID_TONES.join(", ")}` };
    out.responseTone = b.responseTone as ResponseTone;
  }
  return { ok: true, settings: out };
}

export async function GET() {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }
  return NextResponse.json({ settings: await getSettings() });
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const result = validateSettings(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const updated = await updateSettings(result.settings);
  return NextResponse.json({ settings: updated });
}

export async function DELETE() {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }
  return NextResponse.json({ settings: await resetSettings() });
}

export { DEFAULT_SETTINGS };
