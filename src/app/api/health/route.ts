import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLLMCircuitBreakerState } from "@/lib/ai/llm";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  error?: string;
}

/**
 * Health check endpoint — verifies database connectivity and AI circuit breaker state.
 * Used by load balancers and orchestration platforms to determine if the service
 * is ready to receive traffic.
 *
 * Returns 200 if healthy/degraded, 503 if unhealthy.
 */
export async function GET() {
  const checks: Record<string, HealthCheck> = {};

  // Database check
  const dbStart = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", latency_ms: Math.round(performance.now() - dbStart) };
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Unknown database error",
    };
    logger.error("health_check_db_failed", { error: checks.database.error });
  }

  // AI circuit breaker check
  const cbState = getLLMCircuitBreakerState();
  checks.ai_circuit_breaker = {
    status: cbState === "closed" ? "healthy" : cbState === "half-open" ? "degraded" : "unhealthy",
  };

  // Overall status
  const values = Object.values(checks);
  const overall: "healthy" | "degraded" | "unhealthy" = values.every((c) => c.status === "healthy")
    ? "healthy"
    : values.some((c) => c.status === "unhealthy")
    ? "unhealthy"
    : "degraded";

  const statusCode = overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503;

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
