import { z } from "zod";

export const caseIdSchema = z.object({
  caseId: z.string().min(1, "caseId is required"),
});

export const escalateSchema = z.object({
  caseId: z.string().min(1),
  reason: z.string().max(500).optional(),
  agentName: z.string().max(100).optional(),
});

export type CaseIdInput = z.infer<typeof caseIdSchema>;
export type EscalateInput = z.infer<typeof escalateSchema>;
