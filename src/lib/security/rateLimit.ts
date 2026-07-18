/**
 * Rate limiting using a sliding window algorithm.
 * In-memory implementation for single-instance deployments.
 *
 * ⚠️  VERCEL / SERVERLESS NOTE: Each serverless invocation gets a fresh process,
 * so this in-memory store does NOT persist across requests. Rate limits will
 * effectively be per-invocation, not per-user-over-time.
 * For real rate limiting on Vercel, replace this store with an external store
 * such as Upstash Redis (@upstash/ratelimit) or Vercel KV, keeping the same
 * public interface (rateLimit / getClientIdentifier).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  window: string; // e.g. "1m", "1h", "1d"
  max: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([mhd])$/);
  if (!match) throw new Error(`Invalid window format: ${window}. Use format like "1m", "5m", "1h"`);
  const num = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    case "d":
      return num * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid window unit: ${unit}`);
  }
}

/**
 * Rate limit based on an identifier (IP, user ID, or custom key).
 * Returns a result indicating whether the request is limited.
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const windowMs = parseWindow(options.window);
  const key = `${options.keyPrefix ?? "ratelimit"}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= options.max) {
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;
    return {
      limited: true,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    };
  }

  entry.timestamps.push(now);

  return {
    limited: false,
    remaining: options.max - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

/**
 * Extract a client identifier from request headers.
 * Falls back to "unknown" if no identifying header is present.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Periodically clean up expired entries to prevent memory growth.
 * Call this on a setInterval in production.
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Remove entries with no timestamps in the last hour
    const oneHourAgo = now - 60 * 60 * 1000;
    entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000).unref?.();
}
