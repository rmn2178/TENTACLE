import { NextResponse } from "next/server";
import { getLLMCircuitBreakerState } from "@/lib/ai/llm";
import { getStore } from "@/lib/data/store";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, { status: "healthy" | "degraded" | "unhealthy"; latency_ms?: number; error?: string }> = {};

  // In-memory store check (replaces DB check)
  const storeStart = performance.now();
  try {
    const store = getStore();
    void store.cases.length; // trivial read to verify store is accessible
    checks.database = { status: "healthy", latency_ms: Math.round(performance.now() - storeStart) };
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Store error",
    };
  }

  // AI circuit breaker check
  const cbState = getLLMCircuitBreakerState();
  checks.ai_circuit_breaker = {
    status: cbState === "closed" ? "healthy" : cbState === "half-open" ? "degraded" : "unhealthy",
  };

  const values = Object.values(checks);
  const overall: "healthy" | "degraded" | "unhealthy" = values.every((c) => c.status === "healthy")
    ? "healthy"
    : values.some((c) => c.status === "unhealthy")
    ? "unhealthy"
    : "degraded";

  return NextResponse.json(
    { status: overall, timestamp: new Date().toISOString(), checks },
    { status: overall === "unhealthy" ? 503 : 200 }
  );
}
