"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Clock, CircleDot, Ban } from "lucide-react";
import type { CaseRecord, WorkflowStep } from "@/types";
import { cn } from "@/lib/utils";
import { STAGE_ORDER, stageLabel } from "@/lib/workflow/stateMachine";

interface Props {
  caseRecord: CaseRecord;
  onRunStage: (stage: "classify" | "retrieve" | "plan" | "act") => void;
  running: boolean;
  runningStage: string | null;
}

export function WorkflowTimeline({ caseRecord, onRunStage, running, runningStage }: Props) {
  const currentStageIdx = STAGE_ORDER.indexOf(caseRecord.status);
  const steps = caseRecord.workflowSteps ?? [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <CircleDot className="w-3.5 h-3.5 text-info" />
        <span className="text-[12px] font-semibold">Workflow Timeline</span>
        <span className="ml-auto text-[10.5px] text-muted-foreground">
          Stage {Math.max(currentStageIdx, 0) + 1} of {STAGE_ORDER.length}
        </span>
      </div>

      {/* Lifecycle stages */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Case Lifecycle
          </span>
          {caseRecord.status === "escalated" && (
            <span className="text-[10px] text-destructive font-medium">Escalated</span>
          )}
        </div>
        <div className="relative">
          <div className="absolute top-2.5 left-2 right-2 h-px bg-border" />
          <div className="relative flex justify-between">
            {STAGE_ORDER.map((stage, i) => {
              const reached = i <= currentStageIdx;
              const isCurrent = i === currentStageIdx && !["resolved"].includes(caseRecord.status);
              return (
                <div key={stage} className="flex flex-col items-center gap-1 z-10">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.15 : 1,
                      backgroundColor: reached ? "var(--foreground)" : "var(--muted)",
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-background"
                  >
                    {reached && !isCurrent ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      "text-[9.5px] font-medium text-center",
                      reached ? "text-foreground" : "text-muted-foreground/60"
                    )}
                  >
                    {stageLabel(stage)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workflow steps from the plan */}
      {steps.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Executed Steps ({steps.filter((s) => s.status === "executed").length}/{steps.length})
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {steps.map((step, i) => (
                <motion.div
                  key={step.id ?? i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2.5"
                >
                  <StepStatusIcon step={step} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-medium">{step.label}</span>
                      {step.safeToAuto ? (
                        <span className="text-[9.5px] px-1 py-0.5 rounded bg-success/10 text-success font-medium">
                          AUTO
                        </span>
                      ) : (
                        <span className="text-[9.5px] px-1 py-0.5 rounded bg-warning/15 text-warning font-medium">
                          {step.status === "executed" ? "MANUAL" : "MANUAL REQ"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {step.description}
                    </div>
                    {step.result && step.status === "executed" && (
                      <div className="mt-1 rounded-md bg-success/[0.06] border border-success/20 px-2 py-1 text-[10.5px] text-success/90">
                        {step.result}
                      </div>
                    )}
                    {step.status === "skipped" && (
                      <div className="mt-1 rounded-md bg-warning/[0.06] border border-warning/20 px-2 py-1 text-[10.5px] text-warning/90">
                        Awaiting human approval
                      </div>
                    )}
                    {step.executedAt && (
                      <div className="text-[10px] text-muted-foreground/70 mt-1 tnum">
                        {new Date(step.executedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Manual stage triggers */}
      {caseRecord.status !== "resolved" && caseRecord.status !== "escalated" && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Run individual stage
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(["classify", "retrieve", "plan", "act"] as const).map((stage) => {
              const isRunning = running && runningStage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => onRunStage(stage)}
                  disabled={running}
                  className="flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-md border border-border bg-background hover:bg-muted/40 disabled:opacity-50 transition-colors capitalize"
                >
                  {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                  {stage}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepStatusIcon({ step }: { step: WorkflowStep }) {
  switch (step.status) {
    case "executed":
      return (
        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-white shrink-0 mt-0.5">
          <Check className="w-2.5 h-2.5" />
        </div>
      );
    case "skipped":
      return (
        <div className="w-5 h-5 rounded-full bg-warning flex items-center justify-center text-white shrink-0 mt-0.5">
          <Ban className="w-2.5 h-2.5" />
        </div>
      );
    case "failed":
      return (
        <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-white shrink-0 mt-0.5">
          <Ban className="w-2.5 h-2.5" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
        </div>
      );
  }
}
