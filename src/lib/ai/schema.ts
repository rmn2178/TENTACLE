import { z } from "zod";

// Structured output schemas for each AI stage

export const classificationSchema = z.object({
  intent: z.enum([
    "order_delay",
    "damaged_item",
    "wrong_product",
    "refund_request",
    "replacement_request",
    "cancellation_request",
    "address_correction",
    "return_eligibility",
    "general_inquiry",
    "escalation",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated", "furious"]),
  sentimentScore: z.number().min(-1).max(1),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  automationSafe: z.boolean(),
  neededContext: z.array(z.string()),
  explanation: z.string(),
  keywords: z.array(z.string()),
});

export const workflowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  action: z.string(),
  status: z.enum(["pending", "executed", "skipped", "failed"]),
  safeToAuto: z.boolean(),
  executedAt: z.string().optional(),
  result: z.string().optional(),
});

export const resolutionPlanSchema = z.object({
  goal: z.string(),
  approach: z.string(),
  workflowSteps: z.array(workflowStepSchema),
  estimatedResolutionMins: z.number(),
  customerImpact: z.string(),
  risksIdentified: z.array(z.string()),
});

export const retrievalHitSchema = z.object({
  id: z.string(),
  source: z.enum(["policy", "customer_history", "order", "similar_case"]),
  title: z.string(),
  snippet: z.string(),
  relevance: z.number().min(0).max(1),
  meta: z.record(z.string(), z.string()).optional(),
});

export type ClassificationOutput = z.infer<typeof classificationSchema>;
export type ResolutionPlanOutput = z.infer<typeof resolutionPlanSchema>;
export type RetrievalHitOutput = z.infer<typeof retrievalHitSchema>;
