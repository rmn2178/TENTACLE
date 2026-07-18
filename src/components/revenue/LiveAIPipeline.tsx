"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { REVENUE_PIPELINE } from "@/types/revenue";
import type { Lead } from "@/types/revenue";

interface Props {
  lead: Lead;
  running: boolean;
  onComplete?: (stageIndex: number) => void;
}

export function LiveAIPipeline({ lead, running, onComplete }: Props) {
  // currentStage = index of stage currently executing (-1 = not started, >= length = done)
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On every `running` → true, replay the animation up to the lead's current stage
  useEffect(() => {
    if (!running) return;
    setCompletedStages([]);
    setCurrentStage(0);
  }, [running]);

  useEffect(() => {
    if (!running || currentStage < 0) return;
    const targetStage = Math.min(lead.pipelineStageIndex, REVENUE_PIPELINE.length - 1);
    if (currentStage > targetStage) {
      setCurrentStage(-1);
      onComplete?.(targetStage);
      return;
    }
    // Simulate variable-length stage execution
    const stageMs = 320 + Math.random() * 200;
    timerRef.current = setTimeout(() => {
      setCompletedStages((prev) => [...prev, currentStage]);
      setCurrentStage((prev) => prev + 1);
    }, stageMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [running, currentStage, lead.pipelineStageIndex, onComplete]);

  // Not running — show static state up to lead's pipeline index
  const displayCompleted = running
    ? completedStages
    : Array.from({ length: lead.pipelineStageIndex }, (_, i) => i);
  const displayActive = running ? currentStage : -1;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          running ? "bg-success animate-pulse" : lead.pipelineStageIndex > 0 ? "bg-success" : "bg-muted-foreground"
        )} />
        <span className="text-[12px] font-semibold flex-1">
          {running ? "AI Pipeline Running…" : "AI Pipeline"}
        </span>
        <span className="text-[10.5px] tnum text-muted-foreground">
          {lead.pipelineStageIndex}/{REVENUE_PIPELINE.length} stages
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-success rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(
                (running ? completedStages.length : lead.pipelineStageIndex) /
                REVENUE_PIPELINE.length
              ) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="px-4 pb-4 pt-3 space-y-0">
        {REVENUE_PIPELINE.map((stage, i) => {
          const isCompleted = displayCompleted.includes(i);
          const isActive = displayActive === i;
          const isPending = !isCompleted && !isActive;

          return (
            <div
              key={stage.key}
              className={cn(
                "flex items-start gap-3 py-1.5",
                isPending && i > lead.pipelineStageIndex && "opacity-35"
              )}
            >
              {/* Status icon */}
              <div className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    >
                      <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />
                    </motion.div>
                  ) : (
                    <Circle className="w-2.5 h-2.5 text-muted-foreground/40" />
                  )}
                </AnimatePresence>
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[12px] font-medium",
                      isCompleted && "text-foreground",
                      isActive && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </span>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-muted-foreground italic"
                    >
                      Processing…
                    </motion.span>
                  )}
                  {isCompleted && i === lead.pipelineStageIndex - 1 && !running && (
                    <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                      Latest
                    </span>
                  )}
                </div>
                {(isCompleted || isActive) && (
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed">{stage.description}</p>
                )}
              </div>

              {/* Connector line */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
