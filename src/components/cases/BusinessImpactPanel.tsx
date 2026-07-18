"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Heart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessImpactSimulation } from "@/types/simulation";
import type { CaseRecord } from "@/types";

interface Props {
  caseRecord: CaseRecord;
  primaryAction: string;
}

export function BusinessImpactPanel({ caseRecord, primaryAction }: Props) {
  const [simulation, setSimulation] = useState<BusinessImpactSimulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: caseRecord.id, action: primaryAction }),
        });
        const data = await res.json();
        if (!cancelled && data.simulation) {
          setSimulation(data.simulation);
        }
      } catch (err) {
        console.error("[BusinessImpactPanel] failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseRecord.id, primaryAction]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-3.5 h-3.5 text-success" />
          <span className="text-[12px] font-semibold">Business Impact Simulator</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          Simulating impact…
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold">Business Impact Simulator</span>
        </div>
        <div className="text-[11px] text-muted-foreground py-2">
          Simulation unavailable.
        </div>
      </div>
    );
  }

  const recColor =
    simulation.recommendation === "approve"
      ? "text-success bg-success/10"
      : simulation.recommendation === "review"
      ? "text-warning bg-warning/10"
      : "text-destructive bg-destructive/10";

  const riskColor =
    simulation.riskLevel === "low"
      ? "text-success"
      : simulation.riskLevel === "medium"
      ? "text-warning"
      : simulation.riskLevel === "high"
      ? "text-orange-600 dark:text-orange-400"
      : "text-destructive";

  const slaColor =
    simulation.slaImpact.slaStatus === "on_track"
      ? "text-success"
      : simulation.slaImpact.slaStatus === "at_risk"
      ? "text-warning"
      : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-gradient-to-r from-success/[0.06] to-transparent">
        <DollarSign className="w-3.5 h-3.5 text-success" />
        <span className="text-[12px] font-semibold">Business Impact Simulator</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Action: {simulation.actionLabel}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Recommendation banner */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] font-medium",
            recColor
          )}
        >
          {simulation.recommendation === "approve" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : simulation.recommendation === "review" ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          <span className="capitalize">{simulation.recommendation}</span>
          <span className="text-[10.5px] opacity-80 ml-1">— {simulation.recommendationReason}</span>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Refund cost */}
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              <DollarSign className="w-2.5 h-2.5" />
              Refund Cost
            </div>
            <div className="text-[15px] font-semibold tnum text-foreground">
              {simulation.refundCostFormatted}
            </div>
          </div>

          {/* Customer LTV */}
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              <TrendingUp className="w-2.5 h-2.5" />
              Customer LTV
            </div>
            <div className="text-[15px] font-semibold tnum text-foreground">
              {simulation.customerLTVFormatted}
            </div>
          </div>

          {/* Retention probability */}
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              <Heart className="w-2.5 h-2.5" />
              Retention Prob.
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold tnum">
                {simulation.retentionProbabilityPct}
              </span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${simulation.retentionProbability * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    simulation.retentionProbability > 0.75
                      ? "bg-success"
                      : simulation.retentionProbability > 0.5
                      ? "bg-warning"
                      : "bg-destructive"
                  )}
                />
              </div>
            </div>
          </div>

          {/* SLA status */}
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              <Clock className="w-2.5 h-2.5" />
              SLA Status
            </div>
            <div className={cn("text-[13px] font-semibold capitalize", slaColor)}>
              {simulation.slaImpact.slaStatus.replace(/_/g, " ")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Est. {simulation.slaImpact.estimatedResolutionMins}m resolution
            </div>
          </div>
        </div>

        {/* Retention impact */}
        <div className="rounded-lg border border-border p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-2.5 h-2.5" />
              Retention Impact (LTV at risk)
            </span>
            <span className="text-[13px] font-semibold tnum text-destructive">
              {simulation.retentionImpactFormatted}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            If this customer churns, this is the LTV the business loses.
          </div>
        </div>

        {/* Risk score */}
        <div className="rounded-lg border border-border p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              Risk Score
            </span>
            <span className={cn("text-[16px] font-bold tnum", riskColor)}>
              {simulation.riskScore}
              <span className="text-[10px] text-muted-foreground ml-1">/100</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${simulation.riskScore}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "h-full rounded-full",
                simulation.riskLevel === "low"
                  ? "bg-success"
                  : simulation.riskLevel === "medium"
                  ? "bg-warning"
                  : simulation.riskLevel === "high"
                  ? "bg-orange-500"
                  : "bg-destructive"
              )}
            />
          </div>
          {simulation.riskFactors.length > 0 && (
            <div className="space-y-1">
              {simulation.riskFactors.map((factor, i) => (
                <div key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alternatives */}
        {simulation.alternatives.length > 0 && (
          <div>
            <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
              Alternative Actions
            </div>
            <div className="space-y-1">
              {simulation.alternatives.map((alt) => (
                <div
                  key={alt.action}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-[10.5px]"
                >
                  <span className="flex-1 font-medium">{alt.actionLabel}</span>
                  <span className="text-muted-foreground tnum">
                    {alt.retentionProbability > 0.75 ? "↑" : alt.retentionProbability < 0.5 ? "↓" : "→"}{" "}
                    {(alt.retentionProbability * 100).toFixed(0)}%
                  </span>
                  <span
                    className={cn(
                      "px-1 py-0.5 rounded text-[9px] font-medium",
                      alt.recommendation === "approve"
                        ? "bg-success/10 text-success"
                        : alt.recommendation === "review"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {alt.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
