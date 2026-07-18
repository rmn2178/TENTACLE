"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight, Target, ShieldCheck, AlertTriangle, Zap } from "lucide-react";
import type { CaseRecord } from "@/types";
import { cn } from "@/lib/utils";
import { intentLabel, sentimentColor, urgencyColor } from "@/lib/utils/format";

export function ReasoningPanel({ caseRecord }: { caseRecord: CaseRecord }) {
  const hasClassification = caseRecord.intent != null;
  const hasPlan = caseRecord.resolutionPlan != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <Brain className="w-3.5 h-3.5 text-info" />
        <span className="text-[12px] font-semibold">AI Reasoning</span>
        {caseRecord.automationSafe != null && (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
              caseRecord.automationSafe
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {caseRecord.automationSafe ? (
              <>
                <ShieldCheck className="w-2.5 h-2.5" /> Auto-safe
              </>
            ) : (
              <>
                <AlertTriangle className="w-2.5 h-2.5" /> Manual review
              </>
            )}
          </span>
        )}
      </div>

      {!hasClassification ? (
        <div className="p-4 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3" />
            <span>Awaiting classification</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Click <span className="font-medium text-foreground">Auto-resolve</span> to run the full AI pipeline, or
            trigger individual stages below.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Classification summary */}
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Classification
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ReasoningItem label="Intent" value={intentLabel(caseRecord.intent ?? "general_inquiry")} />
              {caseRecord.sentiment && (
                <ReasoningItem
                  label="Sentiment"
                  value={sentimentColor(caseRecord.sentiment).label}
                  valueClass={sentimentColor(caseRecord.sentiment).text}
                />
              )}
              {caseRecord.urgency && (
                <ReasoningItem
                  label="Urgency"
                  value={urgencyColor(caseRecord.urgency).label}
                  valueClass={urgencyColor(caseRecord.urgency).text}
                />
              )}
              <ReasoningItem
                label="Confidence"
                value={`${((caseRecord.confidence ?? 0) * 100).toFixed(0)}%`}
              />
            </div>
            {caseRecord.sentimentScore != null && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground mb-1">
                  <span>Sentiment score</span>
                  <span className="tnum">{caseRecord.sentimentScore.toFixed(2)}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <motion.div
                    initial={{ width: "50%" }}
                    animate={{
                      width: `${((caseRecord.sentimentScore + 1) / 2) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "h-full rounded-full",
                      caseRecord.sentimentScore >= 0.2
                        ? "bg-success"
                        : caseRecord.sentimentScore >= -0.3
                        ? "bg-muted-foreground"
                        : "bg-destructive"
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Plan reasoning */}
          {hasPlan && caseRecord.resolutionPlan && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-border pt-3"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3 h-3 text-info" />
                  <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Resolution Plan
                  </span>
                </div>
                <div className="text-[12px] font-medium mb-1">{caseRecord.resolutionPlan.goal}</div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-2">
                  {caseRecord.resolutionPlan.approach}
                </p>

                <div className="rounded-md bg-muted/40 p-2.5 text-[11px]">
                  <div className="text-muted-foreground mb-0.5">Customer impact</div>
                  <div className="text-foreground/90">{caseRecord.resolutionPlan.customerImpact}</div>
                </div>

                {caseRecord.resolutionPlan.risksIdentified.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {caseRecord.resolutionPlan.risksIdentified.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-warning">
                        <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Est. resolution time</span>
                  <span className="tnum font-medium text-foreground">
                    {caseRecord.resolutionPlan.estimatedResolutionMins < 60
                      ? `${caseRecord.resolutionPlan.estimatedResolutionMins}m`
                      : `${(caseRecord.resolutionPlan.estimatedResolutionMins / 60).toFixed(1)}h`}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ReasoningItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-[12px] font-medium mt-0.5", valueClass)}>{value}</div>
    </div>
  );
}
