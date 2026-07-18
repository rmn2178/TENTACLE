import { NextResponse } from "next/server";
import { metrics } from "@/lib/observability/metrics";
import { requireAuth } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Prometheus-compatible metrics endpoint.
 * Exposes all counters, histograms, and gauges in text exposition format.
 *
 * Requires authentication to prevent public access to operational metrics.
 * In production, consider using a separate metrics auth token or IP allowlist.
 */
export async function GET() {
  try {
    await requireAuth();
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = metrics.toPrometheusFormat();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
