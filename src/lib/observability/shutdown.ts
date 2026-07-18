import { logger } from "@/lib/observability/logger";

let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("graceful_shutdown_started", { signal });
  logger.info("graceful_shutdown_complete", { signal });
  process.exit(0);
}

if (typeof process !== "undefined" && process.on) {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.error("uncaught_exception", { error: err.message, stack: err.stack });
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
    });
  });
}
