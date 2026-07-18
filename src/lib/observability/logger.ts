/**
 * Structured logger with request context propagation via AsyncLocalStorage.
 * Outputs JSON in production, pretty-printed in development.
 * Never logs raw PII — callers must pass already-redacted content.
 */

import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  requestId: string;
  traceId?: string;
  userId?: string;
  userRole?: string;
  path?: string;
  method?: string;
}

const requestContextStore = new AsyncLocalStorage<RequestContext>();

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, msg: string, data?: Record<string, unknown>): string {
  const ctx = requestContextStore.getStore();
  const entry: Record<string, unknown> = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...(ctx ?? {}),
    ...(data ?? {}),
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  // Pretty print for development
  const ctxStr = ctx ? ` [${ctx.requestId}${ctx.userId ? ` user:${ctx.userId}` : ""}]` : "";
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `${entry.timestamp} ${level.toUpperCase()}${ctxStr} ${msg}${dataStr}`;
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const line = formatLog(level, msg, data);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  child: (ctx: Partial<RequestContext>) => ({
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, { ...ctx, ...data }),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, { ...ctx, ...data }),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, { ...ctx, ...data }),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, { ...ctx, ...data }),
  }),
};

/**
 * Run a function with a request context that will be automatically attached
 * to all log entries made within that function's async execution tree.
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return requestContextStore.run(ctx, fn);
}

/**
 * Get the current request context (if any).
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}
