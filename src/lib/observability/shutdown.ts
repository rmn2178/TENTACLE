/**
 * Graceful shutdown — ensures the database connection is closed cleanly
 * when the process receives SIGTERM or SIGINT, preventing data corruption
 * and connection leaks in serverless/containers.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("graceful_shutdown_started", { signal });

  try {
    await db.$disconnect();
    logger.info("database_disconnected");
  } catch (err) {
    logger.error("database_disconnect_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info("graceful_shutdown_complete", { signal });
  process.exit(0);
}

// Only register handlers in Node.js (not Edge runtime)
if (typeof process !== "undefined" && process.on) {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("uncaught_exception", { error: err.message, stack: err.stack });
    // Don't exit immediately — let the error be handled, but flag for shutdown
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
