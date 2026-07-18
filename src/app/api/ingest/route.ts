import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createCaseWithAudit,
  getCases,
  getCustomers,
  getOrders,
  getPolicies,
  getAuditEntries,
  getMetrics,
  nextCaseNumber,
  getCustomerById,
  getOrderById,
} from "@/lib/db/queries";
import { getAllLearningEntries } from "@/lib/ai/learning";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit, getClientIdentifier } from "@/lib/security/rateLimit";
import { logger, withRequestContext, type RequestContext } from "@/lib/observability/logger";
import { metrics } from "@/lib/observability/metrics";
import type { CaseRecord, Channel } from "@/types";

export const runtime = "nodejs";

const ingestSchema = z.object({
  message: z.string().min(5, "Message must be at least 5 characters").max(10000),
  subject: z.string().max(200).optional(),
  channel: z.enum(["chat", "email", "whatsapp"]).optional().default("chat"),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
});

// Create a new case from an inbound customer message.
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const ctx: RequestContext = {
    requestId,
    method: "POST",
    path: "/api/ingest",
  };

  return withRequestContext(ctx, async () => {
    let user;
    try {
      user = await requireAuth();
      ctx.userId = user.id;
      ctx.userRole = user.role;
    } catch (err) {
      const e = err as Error & { status?: number };
      logger.warn("unauthorized_ingest_attempt", { requestId });
      return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
    }

    // Rate limiting — 30 requests per minute per user
    const rateLimitResult = rateLimit(user.id, { window: "1m", max: 30, keyPrefix: "ingest" });
    if (rateLimitResult.limited) {
      logger.warn("rate_limit_exceeded", {
        userId: user.id,
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) },
        }
      );
    }

    const startTime = performance.now();
    const body = await req.json().catch(() => null);
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("invalid_ingest_input", { errors: parsed.error.flatten() });
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { message, subject, channel, customerId, orderId } = parsed.data;

    // Resolve customer
    let customer = customerId ? await getCustomerById(customerId) : null;
    if (!customer) {
      const customers = await getCustomers();
      if (customers.length === 0) {
        return NextResponse.json({ error: "No customers in database" }, { status: 500 });
      }
      customer = customers[Math.floor(Math.random() * customers.length)];
    }

    // Resolve order
    let order = orderId ? await getOrderById(orderId) : undefined;
    if (!order) {
      const customerOrders = await getOrders();
      order = customerOrders.find((o) => o.customerId === customer!.id) ?? undefined;
    }

    const caseNumber = await nextCaseNumber();
    const trimmedSubject = subject?.trim() || "No subject";
    const slaDueAt = new Date(Date.now() + 4 * 3600_000);

    try {
      // Atomic case creation + audit log entry in a single transaction
      const newCase = await createCaseWithAudit(
        {
          caseNumber,
          customerId: customer.id,
          orderId: order?.id,
          channel: channel as Channel,
          subject: trimmedSubject,
          message: message.trim(),
          slaDueAt,
        },
        {
          actorId: user.id,
          actorType: "system",
          action: "case.intake",
          category: "intake",
          detail: `Inbound ${channel} message received from ${customer.name} — subject: "${trimmedSubject}"`,
          metadata: { source: "web", channel },
        }
      );

      const duration = performance.now() - startTime;
      metrics.histogram("cases.creation_duration_ms", duration);
      metrics.increment("cases.created", 1, { channel });

      logger.info("case_created", {
        caseId: newCase.id,
        caseNumber: newCase.caseNumber,
        channel,
        duration_ms: Math.round(duration),
      });

      return NextResponse.json({ case: newCase }, { status: 201 });
    } catch (err) {
      const duration = performance.now() - startTime;
      metrics.increment("cases.creation_errors");
      logger.error("case_creation_failed", {
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Math.round(duration),
        customerId: customer.id,
      });
      return NextResponse.json(
        { error: "Failed to create case" },
        { status: 500 }
      );
    }
  });
}

// List all data (hydrates the frontend store)
export async function GET() {
  const requestId = crypto.randomUUID();
  return withRequestContext({ requestId, method: "GET", path: "/api/ingest" }, async () => {
    try {
      await requireAuth();
    } catch (err) {
      const e = err as Error & { status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
    }

    const [cases, customers, orders, policies, audit, metricsData, learningEntries] = await Promise.all([
      getCases(),
      getCustomers(),
      getOrders(),
      getPolicies(),
      getAuditEntries(50),
      getMetrics(),
      getAllLearningEntries(50),
    ]);

    return NextResponse.json({
      cases: cases as CaseRecord[],
      customers,
      orders,
      policies,
      audit,
      metrics: metricsData,
      learningEntries,
    });
  });
}
