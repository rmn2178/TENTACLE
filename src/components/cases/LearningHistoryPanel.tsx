"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, intentLabel } from "@/lib/utils/format";
import type { OverrideType } from "@/types/learning";

const overrideTypeConfig: Record<OverrideType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  rejected_action: { label: "Rejected Action", color: "text-destructive", icon: XCircle },
  edited_draft: { label: "Edited Draft", color: "text-warning", icon: MessageSquare },
  escalated_false_positive: { label: "False Positive Escalation", color: "text-info", icon: AlertCircle },
  forced_action: { label: "Forced Action", color: "text-orange-600 dark:text-orange-400", icon: CheckCircle2 },
  plan_modified: { label: "Plan Modified", color: "text-violet-500", icon: Sparkles },
  resolved_differently: { label: "Resolved Differently", color: "text-info", icon: CheckCircle2 },
};

interface Props {
  caseId: string;
  intent?: string;
}

export function LearningHistoryPanel({ caseId, intent }: Props) {
  const allEntries = useAppStore((s) => s.learningEntries);

  // Filter to similar overrides (same intent) — exclude this case's own entries
  const similarOverrides = useMemo(
    () =>
      allEntries.filter((e) => {
        if (e.caseId === caseId) return false;
        try {
          const ctx = e.context;
          return intent && ctx.intent === intent;
        } catch {
          return false;
        }
      }),
    [allEntries, caseId, intent]
  );

  if (similarOverrides.length === 0) {
    return null; // Don't render if no learning history
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.04] to-transparent overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-500/15 bg-violet-500/[0.03]">
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[12px] font-semibold">Learning History — Organizational Memory</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {similarOverrides.length} similar override{similarOverrides.length !== 1 ? "s" : ""}
          {intent && ` for ${intentLabel(intent as never)}`}
        </span>
      </div>

      <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
        <div className="text-[10.5px] text-muted-foreground mb-2 leading-relaxed">
          The AI adjusts its confidence based on these past human corrections.
          {similarOverrides.length >= 3
            ? " With enough samples, this pattern directly influences future automation decisions."
            : " More samples will strengthen the learning signal."}
        </div>
        {similarOverrides.slice(0, 8).map((entry, i) => {
          const config = overrideTypeConfig[entry.overrideType] ?? overrideTypeConfig.rejected_action;
          const Icon = config.icon;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-background/60 border border-border"
            >
              <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn("text-[10px] font-medium", config.color)}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {entry.caseNumber ?? "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </div>
                <div className="text-[10.5px] text-foreground/80">
                  {entry.originalDecision.action && (
                    <span>
                      <span className="text-muted-foreground">AI proposed:</span>{" "}
                      <span className="font-medium">{entry.originalDecision.action}</span>
                    </span>
                  )}
                  {entry.humanDecision.action && (
                    <span>
                      {" → "}
                      <span className="text-muted-foreground">Human chose:</span>{" "}
                      <span className="font-medium">{entry.humanDecision.action}</span>
                    </span>
                  )}
                </div>
                {entry.feedbackNote && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                    "{entry.feedbackNote}"
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
