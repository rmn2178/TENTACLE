import "server-only";

/**
 * PII Redaction — scrubs sensitive data before sending to the LLM.
 * Replaces emails, phone numbers, and credit card patterns with placeholders.
 * The original message is still stored in the DB; only the LLM prompt is redacted.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
// Matches most credit card number formats (13-19 digits with optional separators)
const CC_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
// Matches SSN format
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

export interface RedactionResult {
  redacted: string;
  piiFound: string[];
}

export function redactPII(text: string): RedactionResult {
  let redacted = text;
  const piiFound: string[] = [];

  // Emails
  redacted = redacted.replace(EMAIL_REGEX, (match) => {
    piiFound.push(`email:${match}`);
    return "[EMAIL]";
  });

  // Credit cards (before phone to avoid partial matches)
  redacted = redacted.replace(CC_REGEX, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19) {
      piiFound.push(`cc:${digits.slice(-4)}`);
      return `[CC-ENDING-${digits.slice(-4)}]`;
    }
    return match;
  });

  // Phone numbers
  redacted = redacted.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) {
      piiFound.push(`phone:${digits.slice(-4)}`);
      return `[PHONE-ENDING-${digits.slice(-4)}]`;
    }
    return match;
  });

  // SSN
  redacted = redacted.replace(SSN_REGEX, () => {
    piiFound.push("ssn");
    return "[SSN]";
  });

  return { redacted, piiFound };
}

/**
 * Prompt injection sanitization — removes common prompt injection patterns
 * from user input before sending it to the LLM. This prevents attackers from
 * overriding system instructions via the customer message.
 *
 * Also truncates input to prevent token overflow attacks.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (previous|above|all|prior) instructions/gi,
  /you are (now|a|an)\s/gi,
  /^(system|assistant|admin):\s/gim,
  /\[INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\/?system>/gi,
  /<\/?assistant>/gi,
  /```[\s\S]*?```/g, // Remove code blocks that could contain injection
];

const MAX_INPUT_LENGTH = 4000;

export interface SanitizationResult {
  sanitized: string;
  injectionsBlocked: number;
  truncated: boolean;
}

export function sanitizeForLLM(input: string): SanitizationResult {
  let sanitized = input;
  let injectionsBlocked = 0;

  for (const pattern of INJECTION_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      injectionsBlocked += matches.length;
    }
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  let truncated = false;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH) + "... [truncated]";
    truncated = true;
  }

  return { sanitized, injectionsBlocked, truncated };
}

/**
 * Combined PII redaction + prompt injection sanitization.
 * Use this before sending any user content to the LLM.
 */
export function prepareForLLM(input: string): {
  text: string;
  piiFound: string[];
  injectionsBlocked: number;
  truncated: boolean;
} {
  const { redacted, piiFound } = redactPII(input);
  const { sanitized, injectionsBlocked, truncated } = sanitizeForLLM(redacted);
  return { text: sanitized, piiFound, injectionsBlocked, truncated };
}
