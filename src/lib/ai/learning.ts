import "server-only";
import { db } from "@/lib/db";
import type { LearningEntry, LearningSignal, RecordOverrideInput, OverrideType } from "@/types/learning";
import { logger } from "@/lib/observability/logger";

function serializeEntry(row: {
  id: string;
  caseId: string | null;
  customerId: string | null;
  overrideType: string;
  originalDecision: string;
  humanDecision: string;
  context: string;
  feedbackNote: string | null;
  createdBy: string | null;
  createdAt: Date;
  case?: { caseNumber: string } | null;
  customer?: { name: string } | null;
}): LearningEntry {
  let originalDecision: LearningEntry["originalDecision"] = {};
  let humanDecision: LearningEntry["humanDecision"] = {};
  let context: LearningEntry["context"] = {};
  try {
    originalDecision = JSON.parse(row.originalDecision);
  } catch { /* keep default */ }
  try {
    humanDecision = JSON.parse(row.humanDecision);
  } catch { /* keep default */ }
  try {
    context = JSON.parse(row.context);
  } catch { /* keep default */ }
  return {
    id: row.id,
    caseId: row.caseId ?? undefined,
    caseNumber: row.case?.caseNumber,
    customerId: row.customerId ?? undefined,
    customerName: row.customer?.name,
    overrideType: row.overrideType as OverrideType,
    originalDecision,
    humanDecision,
    context,
    feedbackNote: row.feedbackNote ?? undefined,
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Record a human override — this is the "learning" input.
 * Every rejected action, edited draft, forced action, or resolved-differently
 * case is stored here so the AI can learn from it.
 */
export async function recordOverride(
  input: RecordOverrideInput,
  userId: string
): Promise<LearningEntry> {
  const row = await db.caseLearningEntry.create({
    data: {
      caseId: input.caseId,
      customerId: (await db.case.findUnique({ where: { id: input.caseId }, select: { customerId: true } }))?.customerId ?? null,
      overrideType: input.overrideType,
      originalDecision: JSON.stringify(input.originalDecision),
      humanDecision: JSON.stringify(input.humanDecision),
      context: JSON.stringify(input.context),
      feedbackNote: input.feedbackNote ?? null,
      createdBy: userId,
    },
    include: {
      case: { select: { caseNumber: true } },
      customer: { select: { name: true } },
    },
  });

  logger.info("learning_override_recorded", {
    caseId: input.caseId,
    overrideType: input.overrideType,
    userId,
  });

  return serializeEntry(row);
}

/**
 * Retrieve the learning signal for a case — how many similar past overrides exist,
 * what's the override rate, and how should confidence be adjusted?
 *
 * This is the "learning output" — the AI uses this to adjust its confidence
 * and recommendations based on organizational history.
 */
export async function getLearningSignal(
  intent: string | undefined,
  sentiment: string | undefined,
  orderTotalCents: number | undefined
): Promise<LearningSignal> {
  if (!intent) {
    return {
      similarOverrides: 0,
      overrideRate: 0,
      confidenceDelta: 0,
      adjustedConfidence: 0,
      trend: "stable",
      note: "No classification yet — learning signal unavailable.",
      recentOverrides: [],
    };
  }

  // Find all past overrides for the same intent
  const allEntries = await db.caseLearningEntry.findMany({
    where: {
      context: { contains: `"intent":"${intent}"` },
    },
    include: {
      case: { select: { caseNumber: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const similarOverrides = allEntries.length;

  // Further filter by similar sentiment and order value range
  const sentimentMatch = sentiment
    ? allEntries.filter((e) => {
        try {
          const ctx = JSON.parse(e.context) as { sentiment?: string; orderTotalCents?: number };
          if (ctx.sentiment !== sentiment) return false;
          if (orderTotalCents && ctx.orderTotalCents) {
            // Same order-of-magnitude range (within 2x)
            const ratio = ctx.orderTotalCents / orderTotalCents;
            if (ratio < 0.5 || ratio > 2) return false;
          }
          return true;
        } catch {
          return false;
        }
      })
    : allEntries;

  const closelySimilar = sentimentMatch.length;

  // Override rate: if >40% of similar cases were overridden, reduce confidence
  // If <10%, boost confidence slightly
  const overrideRate = similarOverrides > 0 ? closelySimilar / Math.max(similarOverrides, 1) : 0;

  let confidenceDelta = 0;
  let trend: "improving" | "stable" | "degrading" = "stable";
  let note = "";

  if (closelySimilar === 0) {
    confidenceDelta = 0;
    note = "No similar overrides on record — AI operating on base model.";
    trend = "stable";
  } else if (overrideRate > 0.4) {
    // High override rate → reduce confidence
    confidenceDelta = -0.15 * Math.min(overrideRate, 1);
    note = `${closelySimilar} similar case(s) were overridden ${Math.round(overrideRate * 100)}% of the time. Confidence reduced.`;
    trend = "degrading";
  } else if (overrideRate < 0.1 && closelySimilar >= 3) {
    // Low override rate with enough samples → boost confidence
    confidenceDelta = 0.08;
    note = `${closelySimilar} similar cases — AI decisions confirmed ${Math.round((1 - overrideRate) * 100)}% of the time. Confidence boosted.`;
    trend = "improving";
  } else {
    confidenceDelta = -0.05;
    note = `${closelySimilar} similar override(s) on record. Confidence slightly reduced for review.`;
    trend = "stable";
  }

  const recentOverrides = allEntries.slice(0, 5).map(serializeEntry);

  return {
    similarOverrides: closelySimilar,
    overrideRate,
    confidenceDelta,
    adjustedConfidence: 0, // caller adds this to their base confidence
    trend,
    note,
    recentOverrides,
  };
}

/**
 * Get all learning entries (for the Decision Ledger view).
 */
export async function getAllLearningEntries(limit = 50): Promise<LearningEntry[]> {
  const rows = await db.caseLearningEntry.findMany({
    include: {
      case: { select: { caseNumber: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serializeEntry);
}

/**
 * Get learning entries for a specific case.
 */
export async function getLearningEntriesForCase(caseId: string): Promise<LearningEntry[]> {
  const rows = await db.caseLearningEntry.findMany({
    where: { caseId },
    include: {
      case: { select: { caseNumber: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeEntry);
}
