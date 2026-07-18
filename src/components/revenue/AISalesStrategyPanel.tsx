"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Target,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  Brain,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesStrategy, StrategyType } from "@/types/revenue";

// ── Strategy config ────────────────────────────────────────────────────────────

const strategyConfig: Record<StrategyType, { label: string; color: string; bg: string; description: string }> = {
  discovery:      { label: "Discovery",      color: "text-info",        bg: "bg-info/10",        description: "Qualify budget, timeline, and pain before pitching" },
  upsell:         { label: "Upsell",         color: "text-warning",     bg: "bg-warning/10",     description: "Expand usage within existing account" },
  cross_sell:     { label: "Cross Sell",     color: "text-violet-500",  bg: "bg-violet-500/10",  description: "Introduce complementary products" },
  discount:       { label: "Discount",       color: "text-destructive", bg: "bg-destructive/10", description: "Price concession to accelerate close" },
  premium_offer:  { label: "Premium Offer",  color: "text-amber-500",   bg: "bg-amber-500/10",   description: "Present high-value add-ons and premium tier" },
  enterprise_plan:{ label: "Enterprise Plan",color: "text-foreground",  bg: "bg-foreground/8",   description: "Full enterprise contract with custom terms" },
};

// ── Close probability ring ─────────────────────────────────────────────────────

function ProbabilityRing({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * value;
  const color = value > 0.7 ? "text-success" : value > 0.45 ? "text-warning" : "text-destructive";

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} strokeWidth="4" stroke="currentColor" className="text-muted/50" fill="none" />
        <motion.circle
          cx="32" cy="32" r={r} strokeWidth="4"
          stroke="currentColor"
          className={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-[18px] font-bold tnum leading-none", color)}>
          {Math.round(value * 100)}%
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Close</span>
      </div>
    </div>
  );
}

// ── Confidence bar ─────────────────────────────────────────────────────────────

function ConfBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground flex-1 truncate">{label}</span>
      <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "h-full rounded-full",
            value > 0.75 ? "bg-success" : value > 0.5 ? "bg-warning" : "bg-muted-foreground/60"
          )}
        />
      </div>
      <span className="text-[10px] tnum text-muted-foreground w-7 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  strategy: SalesStrategy;
}

export function AISalesStrategyPanel({ strategy }: Props) {
  const [showReasoning, setShowReasoning] = useState(false);
  const sc = strategyConfig[strategy.recommendedStrategy];
  const reasoning = strategy.reasoning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[12px] font-semibold flex-1">AI Sales Strategy</span>
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", sc.bg, sc.color)}>
          {sc.label}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Strategy + close probability */}
        <div className="flex items-start gap-4">
          <ProbabilityRing value={strategy.expectedCloseProbability} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold mb-1">{strategy.strategyLabel}</div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">{sc.description}</p>
            <div className="mt-2">
              <ConfBar value={strategy.confidence} label="AI Confidence" />
            </div>
          </div>
        </div>

        {/* Negotiation plan */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Target className="w-2.5 h-2.5" /> Negotiation Plan
          </div>
          <p className="text-[11.5px] leading-relaxed text-foreground/80 bg-muted/30 rounded-md px-3 py-2">
            {strategy.negotiationPlan}
          </p>
        </div>

        {/* Next best action */}
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5">
          <ArrowRight className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
              Next Best Action
            </div>
            <p className="text-[12px] font-medium text-foreground">{strategy.nextBestAction}</p>
          </div>
        </div>

        {/* Alternatives */}
        {reasoning?.alternativesConsidered && reasoning.alternativesConsidered.length > 0 && (
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="w-2.5 h-2.5" /> Alternatives Considered
            </div>
            <div className="space-y-1.5">
              {reasoning.alternativesConsidered.map((alt) => {
                const altSc = strategyConfig[alt.strategy];
                return (
                  <div key={alt.strategy} className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", altSc.bg, altSc.color)}>
                      {alt.label}
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-muted-foreground/40 rounded-full"
                        style={{ width: `${alt.closeProbability * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] tnum text-muted-foreground">
                      {(alt.closeProbability * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toggle AI reasoning */}
        {reasoning && (
          <button
            onClick={() => setShowReasoning((p) => !p)}
            className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              Why this strategy?
            </span>
            {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        <AnimatePresence>
          {showReasoning && reasoning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1 border-t border-border">
                {/* Why */}
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Lightbulb className="w-2.5 h-2.5" /> Why AI Chose This
                  </div>
                  <p className="text-[11.5px] text-foreground/80 leading-relaxed">{reasoning.whyThisStrategy}</p>
                </div>

                {/* Top drivers */}
                {reasoning.topDrivers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Top Drivers
                    </div>
                    <div className="space-y-2">
                      {reasoning.topDrivers.map((d) => (
                        <div key={d.driver}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium">{d.driver}</span>
                            <span className="text-[10px] tnum text-muted-foreground">
                              {(d.weight * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden mb-0.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${d.weight * 100}%` }}
                              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              className={cn(
                                "h-full rounded-full",
                                d.weight > 0.75 ? "bg-success" : d.weight > 0.5 ? "bg-warning" : "bg-muted-foreground/60"
                              )}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{d.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business factors */}
                {reasoning.businessFactors.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Business Factors
                    </div>
                    <div className="space-y-1">
                      {reasoning.businessFactors.map((f) => (
                        <div key={f.factor} className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">{f.factor}</span>
                          <span className="text-[11px] font-medium text-right">{f.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected strategies */}
                {reasoning.rejectedStrategies.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Rejected Strategies
                    </div>
                    <div className="space-y-1">
                      {reasoning.rejectedStrategies.map((r) => (
                        <div key={r.strategy} className="flex items-start gap-2">
                          <XCircle className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] font-medium">{r.label}</span>
                            <p className="text-[10.5px] text-muted-foreground">{r.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning influence */}
                {reasoning.learningInfluence && (
                  <div className="rounded-md border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-violet-500" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-violet-500">
                        Learning Influence
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/80">{reasoning.learningInfluence}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
