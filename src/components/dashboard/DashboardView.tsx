"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  Zap,
  AlertTriangle,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { CasesChart } from "./CasesChart";
import { WorkflowSummary } from "./WorkflowSummary";
import { AIWorkforceWidget } from "@/components/revenue/AIWorkforceWidget";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo } from "react";

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(value * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className="tnum">
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delta?: number;
  deltaLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "default" | "success" | "warning" | "destructive";
  description?: string;
}

function KpiCard({
  label,
  value,
  decimals,
  prefix,
  suffix,
  delta,
  deltaLabel,
  icon: Icon,
  accent = "default",
  description,
}: KpiCardProps) {
  const accentVal: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  const iconBg: Record<string, string> = {
    default: "bg-muted/60",
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-border bg-card px-4 py-4 elevate-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
            iconBg[accent],
            accentVal[accent]
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div
        className={cn(
          "text-[28px] font-semibold tracking-tight leading-none",
          accentVal[accent]
        )}
      >
        <AnimatedNumber
          value={value}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
        />
      </div>
      {description && (
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">{description}</p>
      )}
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              delta >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {delta >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  const metrics = useAppStore((s) => s.metrics);
  const revenueMetrics = useAppStore((s) => s.revenueMetrics);
  const cases = useAppStore((s) => s.cases);
  const customers = useAppStore((s) => s.customers);
  const setView = useAppStore((s) => s.setView);
  const openCase = useAppStore((s) => s.openCase);

  const customerMap = useMemo(() => {
    const m = new Map<string, (typeof customers)[number]>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const recentActivity = useMemo(
    () =>
      cases
        .filter((c) => ["resolved", "escalated"].includes(c.status))
        .slice(0, 6),
    [cases]
  );

  const openCount = cases.filter(
    (c) => !["resolved", "escalated"].includes(c.status)
  ).length;
  const awaitingApproval = cases.filter(
    (c) => c.status === "planned" && c.automationSafe === false
  ).length;
  // Use revenueMetrics directly so the number reflects the full AI workforce activity
  const aiResolvedToday = revenueMetrics.autoResolvedCases;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

      {/* ── Page title ── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Good morning 👋
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Here's what your AI workforce is doing today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ── 6 KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Today's Revenue"
          value={revenueMetrics.todaysRevenueCents / 100}
          prefix="₹"
          icon={DollarSign}
          accent="success"
          delta={12.4}
          deltaLabel="vs yesterday"
        />
        <KpiCard
          label="Revenue Protected"
          value={revenueMetrics.revenueProtectedCents / 100}
          prefix="₹"
          icon={ArrowUpRight}
          accent="success"
          delta={8.1}
          deltaLabel="vs yesterday"
        />
        <KpiCard
          label="Open Leads"
          value={revenueMetrics.activeLeads}
          icon={Users}
          delta={5}
          deltaLabel="vs last week"
        />
        <KpiCard
          label="AI Resolved Today"
          value={aiResolvedToday}
          icon={CheckCircle2}
          accent="success"
          description={`${Math.round(metrics.automationRate * 100)}% automation rate`}
        />
        <KpiCard
          label="Awaiting Approval"
          value={awaitingApproval}
          icon={AlertTriangle}
          accent={awaitingApproval > 0 ? "warning" : "default"}
          description="Cases needing your decision"
        />
        <KpiCard
          label="Conversion Rate"
          value={revenueMetrics.conversionRate * 100}
          suffix="%"
          decimals={1}
          icon={Zap}
          delta={3.2}
          deltaLabel="vs last month"
        />
      </div>

      {/* ── Two charts side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        {/* Revenue trend / Case volume */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold">Revenue Trend</h2>
              <p className="text-[11.5px] text-muted-foreground">
                Case volume · last 7 days
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px]">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                Inbound
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Resolved
              </span>
            </div>
          </div>
          <CasesChart
            data={metrics.caseVolume}
            autoResolved={metrics.autoResolved}
            totalCases={metrics.totalCases}
          />
        </div>

        {/* Pipeline funnel */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold">Pipeline Funnel</h2>
              <p className="text-[11.5px] text-muted-foreground">
                Cases flowing through AI stages
              </p>
            </div>
            <button
              onClick={() => setView("inbox")}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <WorkflowSummary data={metrics.workflowFunnel} />
        </div>
      </div>

      {/* ── Recent activity + Savings card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* Recent */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold">Recent Activity</h2>
            <button
              onClick={() => setView("audit")}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-muted-foreground">
                No activity yet. Run the AI pipeline on a case to see results here.
              </div>
            ) : (
              recentActivity.map((c, i) => {
                const customer = customerMap.get(c.customerId);
                return (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => openCase(c.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        c.status === "resolved" ? "bg-success" : "bg-destructive"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">
                        {c.caseNumber}
                        {customer && (
                          <span className="text-muted-foreground font-normal">
                            {" "}· {customer.name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.subject}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[10.5px] font-medium shrink-0",
                        c.status === "resolved" ? "text-success" : "text-destructive"
                      )}
                    >
                      {c.status === "resolved" ? "Resolved" : "Escalated"}
                    </span>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Hours saved */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-success mb-2">
            AI Savings This Week
          </div>
          <div className="text-[36px] font-semibold tracking-tight">
            <AnimatedNumber
              value={metrics.estimatedHoursSaved}
              decimals={1}
              suffix="h"
            />
          </div>
          <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
            Agent-hours saved through autonomous resolution.
          </p>
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground">Automation rate</span>
                <span className="font-medium tnum">
                  {Math.round(metrics.automationRate * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.automationRate * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  className="h-full bg-success rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground">AI Confidence</span>
                <span className="font-medium tnum">
                  {Math.round(metrics.avgConfidence * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.avgConfidence * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
                  className="h-full bg-info rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Workforce ── */}
      <AIWorkforceWidget />
    </div>
  );
}
