"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  ArrowUpRight,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lead, SalesStrategy, StrategyType } from "@/types/revenue";

// ── Deterministic simulation ───────────────────────────────────────────────────
// Pure function — no API call needed for demo. Produces a plausible simulation
// from the lead + strategy data already in the store.

interface SimResult {
  expectedRevenueCents: number;
  profitMarginPct: number;
  profitCents: number;
  retentionImpact: number;
  discountCostCents: number;
  lifetimeValueCents: number;
  riskScore: number;
  roi: number;
  revenueSavedCents: number;
  projectedGrowthPct: number;
  closeProbability: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: "pursue" | "negotiate" | "defer";
  recommendationReason: string;
  alternatives: Array<{
    strategy: StrategyType;
    label: string;
    expectedRevenueCents: number;
    closeProbability: number;
    roi: number;
    recommended: boolean;
  }>;
}

const STRATEGY_LABELS: Record<StrategyType, string> = {
  discovery:       "Discovery",
  upsell:          "Upsell",
  cross_sell:      "Cross Sell",
  discount:        "Discount",
  premium_offer:   "Premium Offer",
  enterprise_plan: "Enterprise Plan",
};

function simulate(lead: Lead, strategy: SalesStrategy): SimResult {
  const base = lead.predictedRevenueCents;
  const close = strategy.expectedCloseProbability;
  const expected = Math.round(base * close);
  const marginPct = strategy.recommendedStrategy === "discount" ? 0.28 : strategy.recommendedStrategy === "enterprise_plan" ? 0.52 : 0.42;
  const profit = Math.round(expected * marginPct);
  const retention = Math.min(0.97, close + 0.12);
  const discount = strategy.recommendedStrategy === "discount" ? Math.round(base * 0.15) : 0;
  const risk = Math.round((1 - close) * 80 + (lead.risk === "high" ? 20 : lead.risk === "medium" ? 10 : 0));
  const riskLevel = risk > 55 ? "high" : risk > 30 ? "medium" : "low";
  const roi = +(profit / Math.max(discount + 1000_00, 1) * 100 / 100).toFixed(1);
  const revenueSaved = Math.round(lead.lifetimeValueCents * retention * 0.08);
  const growth = +(close * 40 + 5).toFixed(1);

  const alts: SimResult["alternatives"] = (
    ["upsell", "enterprise_plan", "premium_offer", "discount"] as StrategyType[]
  )
    .filter((s) => s !== strategy.recommendedStrategy)
    .slice(0, 3)
    .map((s, i) => ({
      strategy: s,
      label: STRATEGY_LABELS[s],
      expectedRevenueCents: Math.round(base * (close - 0.1 - i * 0.05)),
      closeProbability: +(close - 0.1 - i * 0.05).toFixed(2),
      roi: +(roi - 0.4 - i * 0.3).toFixed(1),
      recommended: false,
    }));

  return {
    expectedRevenueCents: expected,
    profitMarginPct: marginPct * 100,
    profitCents: profit,
    retentionImpact: retention,
    discountCostCents: discount,
    lifetimeValueCents: lead.lifetimeValueCents,
    riskScore: risk,
    riskLevel,
    roi,
    revenueSavedCents: revenueSaved,
    projectedGrowthPct: growth,
    closeProbability: close,
    recommendation: close > 0.65 ? "pursue" : close > 0.4 ? "negotiate" : "defer",
    recommendationReason:
      close > 0.65
        ? "Strong buying signals and validated budget. Recommend immediate pursuit."
        : close > 0.4
        ? "Moderate intent detected. Negotiate terms to improve close probability."
        : "Low purchase probability. Nurture before investing further resources.",
    alternatives: alts,
  };
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

// ── Row ────────────────────────────────────────────────────────────────────────

function MetricRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] font-semibold tnum", accent ?? "text-foreground")}>{value}</span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  lead: Lead;
  strategy: SalesStrategy;
}

export function RevenueSimulatorPanel({ lead, strategy }: Props) {
  const [showAlts, setShowAlts] = useState(false);
  const sim = simulate(lead, strategy);

  const recColor = sim.recommendation === "pursue"
    ? "text-success bg-success/10 border-success/20"
    : sim.recommendation === "negotiate"
    ? "text-warning bg-warning/10 border-warning/20"
    : "text-destructive bg-destructive/10 border-destructive/20";

  const riskColor = sim.riskLevel === "low" ? "text-success"
    : sim.riskLevel === "medium" ? "text-warning" : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <BarChart3 className="w-3.5 h-3.5 text-success" />
        <span className="text-[12px] font-semibold flex-1">Business Impact Simulator</span>
        <RefreshCw className="w-3 h-3 text-muted-foreground" />
      </div>

      <div className="p-4 space-y-4">
        {/* Hero metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Expected Revenue</span>
            </div>
            <div className="text-[20px] font-bold text-success tnum">{fmt(sim.expectedRevenueCents)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {(sim.closeProbability * 100).toFixed(0)}% close probability
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-foreground" />
              <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Profit</span>
            </div>
            <div className="text-[20px] font-bold tnum">{fmt(sim.profitCents)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {sim.profitMarginPct.toFixed(0)}% margin
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div>
          <MetricRow label="Retention Impact" value={`${(sim.retentionImpact * 100).toFixed(0)}%`} accent="text-success" />
          <MetricRow label="Discount Cost" value={sim.discountCostCents > 0 ? fmt(sim.discountCostCents) : "—"} />
          <MetricRow label="Lifetime Value" value={fmt(sim.lifetimeValueCents)} />
          <MetricRow label="ROI" value={`${sim.roi.toFixed(1)}×`} accent="text-success" />
          <MetricRow label="Revenue Saved" value={fmt(sim.revenueSavedCents)} accent="text-success" />
          <MetricRow label="Projected Growth" value={`+${sim.projectedGrowthPct.toFixed(1)}%`} accent="text-success" />
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-[11px] text-muted-foreground">Risk Score</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", sim.riskLevel === "low" ? "bg-success" : sim.riskLevel === "medium" ? "bg-warning" : "bg-destructive")}
                  style={{ width: `${sim.riskScore}%` }}
                />
              </div>
              <span className={cn("text-[11px] font-semibold tnum", riskColor)}>{sim.riskScore}</span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className={cn("rounded-md border px-3 py-2.5", recColor)}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {sim.recommendation === "pursue" ? "Pursue" : sim.recommendation === "negotiate" ? "Negotiate" : "Defer"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">{sim.recommendationReason}</p>
        </div>

        {/* Alternative comparison */}
        <button
          onClick={() => setShowAlts((p) => !p)}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3" /> Alternative Strategy Comparison
          </span>
          {showAlts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {showAlts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2"
          >
            <div className="grid grid-cols-[1fr_80px_60px_40px] gap-1 text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              <div>Strategy</div>
              <div className="text-right">Revenue</div>
              <div className="text-right">Close%</div>
              <div className="text-right">ROI</div>
            </div>
            {sim.alternatives.map((alt) => (
              <div key={alt.strategy} className="grid grid-cols-[1fr_80px_60px_40px] gap-1 items-center px-1 rounded-md hover:bg-muted/40 py-1">
                <span className="text-[11px] font-medium">{alt.label}</span>
                <span className="text-[10.5px] tnum text-right text-muted-foreground">{fmt(alt.expectedRevenueCents)}</span>
                <span className="text-[10.5px] tnum text-right text-muted-foreground">{(alt.closeProbability * 100).toFixed(0)}%</span>
                <span className="text-[10.5px] tnum text-right text-muted-foreground">{alt.roi}×</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
