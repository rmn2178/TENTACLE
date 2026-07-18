import "server-only";
import {
  getLearningEntries,
  getLearningEntriesForCase as storeGetForCase,
  addLearningEntry,
  getStore,
} from "@/lib/data/store";
import type { LearningEntry, LearningSignal, RecordOverrideInput, OverrideType } from "@/types/learning";
import { logger } from "@/lib/observability/logger";
import { randomUUID } from "crypto";

export async function recordOverride(
  input: RecordOverrideInput,
  userId: string
): Promise<LearningEntry> {
  const store = getStore();
  const caseRecord = input.caseId
    ? store.cases.find((c) => c.id === input.caseId)
    : undefined;
  const customer = caseRecord
    ? store.customers.find((c) => c.id === caseRecord.customerId)
    : undefined;

  const entry: LearningEntry = {
    id: `learn_${randomUUID().slice(0, 8)}`,
    caseId: input.caseId,
    caseNumber: caseRecord?.caseNumber,
    customerId: caseRecord?.customerId,
    customerName: customer?.name,
    overrideType: input.overrideType as OverrideType,
    originalDecision: input.originalDecision as LearningEntry["originalDecision"],
    humanDecision: input.humanDecision as LearningEntry["humanDecision"],
    context: input.context as LearningEntry["context"],
    feedbackNote: input.feedbackNote,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };

  addLearningEntry(entry);

  logger.info("learning_override_recorded", {
    caseId: input.caseId,
    overrideType: input.overrideType,
    userId,
  });

  return entry;
}

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

  const allEntries = getLearningEntries(50).filter((e) => {
    const ctx = e.context as { intent?: string };
    return ctx?.intent === intent;
  });

  const similarOverrides = allEntries.length;

  const sentimentMatch = sentiment
    ? allEntries.filter((e) => {
        const ctx = e.context as { sentiment?: string; orderTotalCents?: number };
        if (ctx.sentiment !== sentiment) return false;
        if (orderTotalCents && ctx.orderTotalCents) {
          const ratio = ctx.orderTotalCents / orderTotalCents;
          if (ratio < 0.5 || ratio > 2) return false;
        }
        return true;
      })
    : allEntries;

  const closelySimilar = sentimentMatch.length;
  const overrideRate = similarOverrides > 0 ? closelySimilar / Math.max(similarOverrides, 1) : 0;

  let confidenceDelta = 0;
  let trend: "improving" | "stable" | "degrading" = "stable";
  let note = "";

  if (closelySimilar === 0) {
    confidenceDelta = 0;
    note = "No similar overrides on record — AI operating on base model.";
    trend = "stable";
  } else if (overrideRate > 0.4) {
    confidenceDelta = -0.15 * Math.min(overrideRate, 1);
    note = `${closelySimilar} similar case(s) were overridden ${Math.round(overrideRate * 100)}% of the time. Confidence reduced.`;
    trend = "degrading";
  } else if (overrideRate < 0.1 && closelySimilar >= 3) {
    confidenceDelta = 0.08;
    note = `${closelySimilar} similar cases — AI decisions confirmed ${Math.round((1 - overrideRate) * 100)}% of the time. Confidence boosted.`;
    trend = "improving";
  } else {
    confidenceDelta = -0.05;
    note = `${closelySimilar} similar override(s) on record. Confidence slightly reduced for review.`;
    trend = "stable";
  }

  return {
    similarOverrides: closelySimilar,
    overrideRate,
    confidenceDelta,
    adjustedConfidence: 0,
    trend,
    note,
    recentOverrides: allEntries.slice(0, 5),
  };
}

export async function getAllLearningEntries(limit = 50): Promise<LearningEntry[]> {
  return getLearningEntries(limit);
}

export async function getLearningEntriesForCase(caseId: string): Promise<LearningEntry[]> {
  return storeGetForCase(caseId);
}
