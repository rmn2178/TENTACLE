/**
 * Retry with exponential backoff and optional jitter.
 * Supports retryable error filtering and max delay cap.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms cap
  jitter?: boolean; // default true — adds 0-50% random jitter
  retryOn?: (err: unknown) => boolean; // predicate to decide if error is retryable
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown
  ) {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, jitter = true, retryOn } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // If a retry predicate is provided, check if we should retry this error
      if (retryOn && !retryOn(err)) {
        throw err;
      }

      // Don't sleep on the last attempt
      if (attempt === maxAttempts) break;

      // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const finalDelay = jitter ? delay * (0.5 + Math.random() * 0.5) : delay;

      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }

  throw new RetryExhaustedError(
    `Retry exhausted after ${maxAttempts} attempts`,
    maxAttempts,
    lastError
  );
}
