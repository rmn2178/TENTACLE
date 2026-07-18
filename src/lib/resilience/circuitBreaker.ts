/**
 * Circuit Breaker — prevents cascade failures when an external service (LLM, DB, payment)
 * is unavailable. After `failureThreshold` failures, the circuit opens and fast-fails
 * all subsequent calls until `resetTimeout` elapses, then enters half-open to probe.
 *
 * State machine: closed → (failures ≥ threshold) → open → (resetTimeout) → half-open →
 *   (success × halfOpenMaxAttempts) → closed
 *   (failure) → open
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number; // ms before transitioning from open to half-open
  halfOpenMaxAttempts: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.transitionTo("half-open");
      } else {
        throw new CircuitOpenError(
          `Circuit breaker is open (failures: ${this.failures}, reset in ${Math.ceil(
            (this.options.resetTimeout - (Date.now() - this.lastFailureTime)) / 1000
          )}s)`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "half-open") {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        this.transitionTo("closed");
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.transitionTo("open");
    } else if (this.failures >= this.options.failureThreshold) {
      this.transitionTo("open");
    }
  }

  private transitionTo(newState: CircuitState) {
    const oldState = this.state;
    if (oldState === newState) return;
    this.state = newState;

    if (newState === "closed") {
      this.failures = 0;
      this.halfOpenAttempts = 0;
    } else if (newState === "half-open") {
      this.halfOpenAttempts = 0;
    }

    this.options.onStateChange?.(oldState, newState);
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.transitionTo("closed");
  }
}
