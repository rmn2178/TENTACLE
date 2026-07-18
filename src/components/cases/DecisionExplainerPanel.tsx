"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Loader2,
  Shield,
  ShieldAlert,
  TrendingUp,
  Zap,
  Target,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DecisionExplanation } from "@/types/explanation";
import type { CaseRecord } from "@/types";
import { intentLabel } from "@/lib/utils/format";

interface Props {
  caseRecord: CaseRecord;
}

export function DecisionExplainerPanel({ caseRecord }: Props) {
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: caseRecord.id }),
        });
        const data = await res.json();
        if (!cancelled && data.explanation) {
          setExplanation(data.explanation);
        }
      } catch (err) {
        console.error("[DecisionExplainerPanel] failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseRecord.id, caseRecord.status, caseRecord.updatedAt]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[12px] font-semibold">Why This Action? — Decision Explainer</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          Analyzing decision factors…
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold">Decision Explainer</span>
        </div>
        <div className="text-[11px] text-muted-foreground py-2">
          Explanation unavailable.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-gradient-to-r from-violet-500/[0.06] to-transparent">
        <Brain className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[12px] font-semibold">Why This Action? — Decision Explainer</span>
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
                <Shield className="w-2.5 h-2.5" /> Safe
              </>
            ) : (
              <>
                <ShieldAlert className="w-2.5 h-2.5" /> Unsafe
              </>
            )}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Top signals */}
        {explanation.topSignals.length > 0 && (
          <div>
            <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />
              Top Signals
            </div>
            <div className="space-y-1.5">
              {explanation.topSignals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-12 shrink-0 mt-0.5">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sig.weight * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full bg-violet-500 rounded-full"
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground tnum mt-0.5 block">
                      {Math.round(sig.weight * 100)}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium">{sig.signal}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug">{sig.detail}</div>
                    <span className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                      {sig.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy matches */}
        {explanation.policyMatches.length > 0 && (
          <div>
            <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
              <BookOpen className="w-2.5 h-2.5" />
              Policy Evaluation
            </div>
            <div className="space-y-1">
              {explanation.policyMatches.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 px-2 py-1.5 rounded-md border text-[10.5px]",
                    p.passed
                      ? "border-success/20 bg-success/[0.04]"
                      : "border-warning/20 bg-warning/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5",
                      p.passed ? "bg-success text-white" : "bg-warning text-white"
                    )}
                  >
                    {p.passed ? "✓" : "!"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {p.code} <span className="text-muted-foreground">— {p.title}</span>
                    </div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5">{p.reason}</div>
                  </div>
                  <span className="text-[9px] text-muted-foreground tnum shrink-0 mt-0.5">
                    {(p.relevance * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence breakdown */}
        <div>
          <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
            <Target className="w-2.5 h-2.5" />
            Confidence Breakdown
          </div>
          <div className="rounded-lg bg-muted/30 p-2.5 space-y-1.5">
            {explanation.confidenceBreakdown.factors.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-24 shrink-0">{f.factor}</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(0, Math.min(100, f.contribution * 100))}%`,
                    }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className={cn(
                      "h-full rounded-full",
                      f.contribution > 0.15
                        ? "bg-success"
                        : f.contribution > 0.05
                        ? "bg-warning"
                        : f.contribution < 0
                        ? "bg-destructive"
                        : "bg-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] tnum font-medium w-10 text-right",
                    f.contribution < 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  {f.contribution > 0 ? "+" : ""}
                  {Math.round(f.contribution * 100)}%
                </span>
              </div>
            ))}
            <div className="pt-1.5 border-t border-border flex items-center justify-between">
              <span className="text-[10.5px] font-medium">Overall confidence</span>
              <span className="text-[14px] font-bold tnum">
                {(explanation.confidenceBreakdown.overall * 100).toFixed(0)}%
              </span>
            </div>
            {explanation.learningSignals.similarOverrides > 0 && (
              <div className="pt-1.5 border-t border-border">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Learning-adjusted</span>
                  <span className="font-medium tnum">
                    {(explanation.learningSignals.adjustedConfidence * 100).toFixed(0)}%
                    <span
                      className={cn(
                        "ml-1 text-[9px]",
                        explanation.learningSignals.confidenceDelta < 0
                          ? "text-destructive"
                          : "text-success"
                      )}
                    >
                      ({explanation.learningSignals.confidenceDelta > 0 ? "+" : ""}
                      {Math.round(explanation.learningSignals.confidenceDelta * 100)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Safety analysis */}
        <div>
          <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            Safety Analysis
          </div>
          <div className="space-y-1">
            {explanation.safetyAnalysis.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                <span
                  className={cn(
                    "w-1 h-1 rounded-full mt-1.5 shrink-0",
                    explanation.safetyAnalysis.isSafe ? "bg-success" : "bg-destructive"
                  )}
                />
                <span className="text-foreground/80">{reason}</span>
              </div>
            ))}
          </div>
          {explanation.safetyAnalysis.guardrails.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                Guardrails Triggered
              </div>
              {explanation.safetyAnalysis.guardrails.map((g, i) => (
                <div key={i} className="text-[10px] text-violet-600 dark:text-violet-400 font-mono mb-0.5">
                  ⚡ {g}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Escalation analysis */}
        {explanation.escalationAnalysis?.triggered && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3 h-3 text-destructive" />
              <span className="text-[10.5px] font-semibold text-destructive uppercase tracking-wider">
                Escalation Analysis
              </span>
            </div>
            <div className="text-[10.5px] text-foreground/80 mb-1">
              {explanation.escalationAnalysis.reason}
            </div>
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium">Triggered by:</span>{" "}
              {explanation.escalationAnalysis.triggeredBy}
            </div>
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium">Recommended action:</span>{" "}
              {explanation.escalationAnalysis.recommendedAction}
            </div>
          </div>
        )}

        {/* Learning signals */}
        {explanation.learningSignals.similarOverrides > 0 && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.04] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-violet-500" />
              <span className="text-[10.5px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                Learning Signal
              </span>
            </div>
            <div className="text-[10.5px] text-foreground/80">
              {explanation.learningSignals.note}
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>
                <span className="font-medium tnum">{explanation.learningSignals.similarOverrides}</span> similar overrides
              </span>
              <span>
                <span className="font-medium tnum">{Math.round(explanation.learningSignals.overrideRate * 100)}%</span> override rate
              </span>
              <span
                className={cn(
                  "font-medium",
                  explanation.learningSignals.confidenceDelta < 0
                    ? "text-destructive"
                    : "text-success"
                )}
              >
                {explanation.learningSignals.confidenceDelta > 0 ? "+" : ""}
                {Math.round(explanation.learningSignals.confidenceDelta * 100)}% confidence delta
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
