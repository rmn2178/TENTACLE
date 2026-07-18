import { GoogleGenAI } from "@google/genai";
import { prepareForLLM } from "@/lib/security/pii";
import { CircuitBreaker, CircuitOpenError } from "@/lib/resilience/circuitBreaker";
import { retryWithBackoff, RetryExhaustedError } from "@/lib/resilience/retry";
import { logger } from "@/lib/observability/logger";
import { metrics, BUCKETS } from "@/lib/observability/metrics";

// Gemini model to use — flash is fast and cheap; swap to "gemini-1.5-pro" for
// higher quality at the cost of latency/price.
const GEMINI_MODEL = "gemini-2.0-flash";

let _client: GoogleGenAI | null = null;

export function getLLM(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

// LLM call timeout — if the model doesn't respond in this window, fail fast
const LLM_TIMEOUT_MS = 8000;

// Circuit breaker: 5 failures → open for 60s → half-open with 3 probe attempts
const llmCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60_000,
  halfOpenMaxAttempts: 3,
  onStateChange: (from, to) => {
    logger.warn("llm_circuit_breaker_state_change", { from, to });
    metrics.gauge("llm_circuit_breaker_state", to === "closed" ? 0 : to === "half-open" ? 1 : 2);
  },
});

export function getLLMCircuitBreakerState(): string {
  return llmCircuitBreaker.getState();
}

// Robust JSON extraction from LLM output (handles ```json fences and prose)
export function extractJSON<T = unknown>(raw: string): T {
  if (!raw) throw new Error("Empty LLM response");
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // fallthrough
  }
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // fallthrough
    }
  }
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  let start = -1;
  let open = "";
  let close = "";
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) {
    start = firstObj;
    open = "{";
    close = "}";
  } else if (firstArr >= 0) {
    start = firstArr;
    open = "[";
    close = "]";
  }
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === open) depth++;
        else if (c === close) {
          depth--;
          if (depth === 0) {
            const candidate = trimmed.slice(start, i + 1);
            try {
              return JSON.parse(candidate) as T;
            } catch {
              break;
            }
          }
        }
      }
    }
  }
  throw new Error("Could not parse JSON from LLM output");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`LLM call timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  redactPII?: boolean; // default true — scrub PII from the user prompt before sending
  sanitize?: boolean; // default true — remove prompt injection patterns
}

/**
 * Call the Gemini LLM and parse the response as JSON.
 * Applies PII redaction, prompt injection sanitization, circuit breaker,
 * retry with exponential backoff, and an 8s timeout.
 *
 * Throws on unrecoverable failure — callers should have a heuristic fallback.
 */
export async function callLLMJSON<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  opts?: LLMCallOptions
): Promise<T> {
  const startTime = performance.now();
  const shouldRedact = opts?.redactPII !== false;
  const shouldSanitize = opts?.sanitize !== false;

  // Prepare the prompt — redact PII and sanitize injection attempts
  let preparedPrompt = userPrompt;
  let piiFound: string[] = [];
  let injectionsBlocked = 0;
  let truncated = false;

  if (shouldRedact || shouldSanitize) {
    const result = prepareForLLM(userPrompt);
    preparedPrompt = result.text;
    piiFound = result.piiFound;
    injectionsBlocked = result.injectionsBlocked;
    truncated = result.truncated;
  }

  if (piiFound.length > 0) {
    logger.info("llm_pii_redacted", { count: piiFound.length, types: piiFound.map((p) => p.split(":")[0]) });
  }
  if (injectionsBlocked > 0) {
    logger.warn("llm_injection_blocked", { count: injectionsBlocked });
    metrics.increment("llm.injections_blocked", injectionsBlocked);
  }
  if (truncated) {
    logger.warn("llm_input_truncated", { originalLength: userPrompt.length });
  }

  try {
    const result = await llmCircuitBreaker.execute(async () => {
      return retryWithBackoff(
        async () => {
          const genai = getLLM();
          const model = genai.models;

          // Combine system prompt and user prompt — Gemini's generateContent
          // supports a system instruction field separately.
          const completionPromise = model.generateContent({
            model: GEMINI_MODEL,
            config: {
              systemInstruction: systemPrompt,
              temperature: opts?.temperature ?? 0.2,
              maxOutputTokens: opts?.maxTokens ?? 1200,
            },
            contents: [
              {
                role: "user",
                parts: [{ text: preparedPrompt }],
              },
            ],
          });

          const res = await withTimeout(completionPromise, LLM_TIMEOUT_MS);
          const content = res.text ?? "";
          return extractJSON<T>(content);
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 8000,
          // Retry on timeout and network errors, but not on JSON parse errors
          // (a malformed response is unlikely to improve on retry)
          retryOn: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            return msg.includes("timed out") || msg.includes("fetch") || msg.includes("network");
          },
        }
      );
    });

    const duration = performance.now() - startTime;
    metrics.histogram("llm.call_duration_ms", duration, {}, BUCKETS.durationMs);
    metrics.increment("llm.call_success");
    logger.debug("llm_call_success", { duration_ms: Math.round(duration) });

    return result;
  } catch (err) {
    const duration = performance.now() - startTime;
    metrics.histogram("llm.call_duration_ms", duration, {}, BUCKETS.durationMs);
    metrics.increment("llm.call_failure");

    if (err instanceof CircuitOpenError) {
      logger.warn("llm_circuit_open", { duration_ms: Math.round(duration) });
    } else if (err instanceof RetryExhaustedError) {
      logger.error("llm_retry_exhausted", {
        duration_ms: Math.round(duration),
        attempts: err.attempts,
        lastError: err.lastError instanceof Error ? err.lastError.message : String(err.lastError),
      });
    } else {
      logger.error("llm_call_failed", {
        duration_ms: Math.round(duration),
        error: err instanceof Error ? err.message : String(err),
      });
    }

    throw err;
  }
}
