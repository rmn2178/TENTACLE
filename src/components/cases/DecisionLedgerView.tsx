"use client";

import { useAppStore } from "@/store/appStore";
import { motion } from "framer-motion";
import {
  Brain,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  intentLabel,
  statusColor,
} from "@/lib/utils/format";
import type { OverrideType } from "@/types/learning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const overrideTypeConfig: Record<
  OverrideType,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  rejected_action:         { label: "Rejected",     color: "text-destructive bg-destructive/10", icon: XCircle       },
  edited_draft:            { label: "Edited",        color: "text-warning bg-warning/10",         icon: MessageSquare },
  escalated_false_positive:{ label: "False Positive",color: "text-info bg-info/10",               icon: AlertTriangle },
  forced_action:           { label: "Forced",        color: "text-orange-600 bg-orange-500/10",   icon: CheckCircle2  },
  plan_modified:           { label: "Modified",      color: "text-violet-500 bg-violet-500/10",   icon: Sparkles      },
  resolved_differently:    { label: "Different",     color: "text-info bg-info/10",               icon: CheckCircle2  },
};

export function DecisionLedgerView() {
  const cases = useAppStore((s) => s.cases);
  const learningEntries = useAppStore((s) => s.learningEntries);
  const customers = useAppStore((s) => s.customers);
  const openCase = useAppStore((s) => s.openCase);
  const [filter, setFilter] = useState("all");

  const customerMap = useMemo(() => {
    const m = new Map<string, (typeof customers)[number]>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const ledgerRows = useMemo(() => {
    const rows: Array<{
      id: string;
      type: "case" | "override";
      caseNumber?: string;
      customerName?: string;
      intent?: string;
      confidence?: number;
      status: string;
      overrideType?: OverrideType;
      revImpactCents: number | null;
      humanOverride: boolean;
      businessOutcome: string;
      createdAt: string;
      caseId?: string;
    }> = [];

    for (const c of cases) {
      if (!c.intent) continue;
      const revImpact =
        c.status === "resolved"
          ? Math.round((c.confidence ?? 0.7) * 28_000_00)
          : c.status === "escalated"
          ? null
          : null;
      rows.push({
        id: c.id,
        type: "case",
        caseNumber: c.caseNumber,
        customerName: customerMap.get(c.customerId)?.name,
        intent: c.intent,
        confidence: c.confidence,
        status: c.status,
        revImpactCents: revImpact,
        humanOverride: false,
        businessOutcome:
          c.status === "resolved"
            ? "Auto-resolved"
            : c.status === "escalated"
            ? "Escalated"
            : c.status === "planned"
            ? "Awaiting approval"
            : "In progress",
        createdAt: c.createdAt,
        caseId: c.id,
      });
    }

    for (const e of learningEntries) {
      rows.push({
        id: e.id,
        type: "override",
        caseNumber: e.caseNumber,
        customerName: e.customerName,
        intent: e.context.intent,
        confidence: e.originalDecision.confidence,
        status: "override",
        overrideType: e.overrideType,
        revImpactCents: -Math.round(
          4_500_00 * (1 - (e.originalDecision.confidence ?? 0.6))
        ),
        humanOverride: true,
        businessOutcome: `Human chose: ${e.humanDecision.action ?? "different action"}`,
        createdAt: e.createdAt,
        caseId: e.caseId,
      });
    }

    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filter === "overrides") return rows.filter((r) => r.type === "override");
    if (filter === "auto_resolved") return rows.filter((r) => r.status === "resolved");
    if (filter === "escalated") return rows.filter((r) => r.status === "escalated");
    return rows;
  }, [cases, learningEntries, customerMap, filter]);

  const stats = useMemo(() => {
    const total = ledgerRows.length;
    const overrides = ledgerRows.filter((r) => r.type === "override").length;
    const resolved = ledgerRows.filter((r) => r.status === "resolved").length;
    const avgConf =
      total > 0
        ? ledgerRows.reduce((s, r) => s + (r.confidence ?? 0), 0) / total
        : 0;
    return { total, overrides, resolved, avgConf };
  }, [ledgerRows]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" />
            Decision Ledger
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Every AI decision, with full revenue impact and learning trail
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-[160px] text-[12px] bg-background">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All decisions</SelectItem>
            <SelectItem value="overrides">Human overrides</SelectItem>
            <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 4 summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Decisions", value: stats.total,    icon: Brain,        color: "text-violet-500" },
          { label: "Human Overrides", value: stats.overrides,icon: Sparkles,     color: "text-orange-500" },
          { label: "Auto-Resolved",   value: stats.resolved, icon: CheckCircle2, color: "text-success"   },
          {
            label: "Avg Confidence",
            value: `${(stats.avgConf * 100).toFixed(0)}%`,
            icon: TrendingUp,
            color: "text-info",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={cn("w-3.5 h-3.5", s.color)} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
            </div>
            <div className="text-[22px] font-bold tnum">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_80px_100px_100px_90px_minmax(0,1fr)] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <div>Decision</div>
          <div>Customer</div>
          <div>Confidence</div>
          <div>Revenue Impact</div>
          <div>Status</div>
          <div>Human Override</div>
          <div>Business Outcome</div>
        </div>

        <div
          className="divide-y divide-border overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 340px)" }}
        >
          {ledgerRows.length === 0 ? (
            <div className="p-12 text-center">
              <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">
                No decisions match this filter
              </p>
            </div>
          ) : (
            ledgerRows.map((row, i) => {
              const sc =
                row.status !== "override"
                  ? statusColor(row.status as never)
                  : null;
              const oc = row.overrideType
                ? overrideTypeConfig[row.overrideType]
                : null;
              const OcIcon = oc?.icon;

              return (
                <motion.button
                  key={row.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.25) }}
                  onClick={() => row.caseId && openCase(row.caseId)}
                  className="w-full text-left grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_80px_100px_100px_90px_minmax(0,1fr)] gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  {/* Decision */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {row.type === "override" && OcIcon ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded shrink-0",
                            oc!.color
                          )}
                        >
                          <OcIcon className="w-2.5 h-2.5" />
                          {oc!.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          <Brain className="w-2.5 h-2.5" />
                          AI Decision
                        </span>
                      )}
                      <span className="text-[11.5px] font-medium truncate">
                        {row.caseNumber ?? "—"}
                      </span>
                    </div>
                    {row.intent && (
                      <span className="text-[10.5px] text-muted-foreground pl-0.5">
                        {intentLabel(row.intent as never)}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 tnum">
                      {formatRelativeTime(row.createdAt)}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="hidden md:flex items-center">
                    <span className="text-[12px] truncate">
                      {row.customerName ?? "—"}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="hidden md:flex items-center gap-1.5">
                    {row.confidence != null ? (
                      <>
                        <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.confidence > 0.8
                                ? "bg-success"
                                : row.confidence > 0.6
                                ? "bg-warning"
                                : "bg-destructive"
                            )}
                            style={{ width: `${row.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] tnum text-muted-foreground">
                          {(row.confidence * 100).toFixed(0)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Revenue impact */}
                  <div className="hidden md:flex items-center">
                    {row.revImpactCents != null ? (
                      <span
                        className={cn(
                          "text-[11px] tnum font-medium",
                          row.revImpactCents >= 0
                            ? "text-success"
                            : "text-destructive"
                        )}
                      >
                        {row.revImpactCents >= 0 ? "+" : ""}
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(row.revImpactCents / 100)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 text-[11px]">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex items-center">
                    {sc ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded",
                          sc.bg,
                          sc.text
                        )}
                      >
                        <span className={cn("w-1 h-1 rounded-full", sc.dot)} />
                        {sc.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Human override */}
                  <div className="hidden md:flex items-center">
                    {row.humanOverride ? (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600">
                        <ShieldAlert className="w-2.5 h-2.5" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">
                        <Shield className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>

                  {/* Business outcome */}
                  <div className="hidden md:flex items-center">
                    <span className="text-[11.5px] text-foreground/80 truncate">
                      {row.businessOutcome}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Learning summary — only if overrides exist */}
      {learningEntries.length > 0 && (
        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-[13px] font-semibold">
              Organizational Learning
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Total Overrides
              </div>
              <div className="text-[20px] font-bold tnum">
                {learningEntries.length}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Most Common
              </div>
              <div className="text-[12.5px] font-medium capitalize">
                {Object.entries(
                  learningEntries.reduce(
                    (acc, e) => {
                      acc[e.overrideType] = (acc[e.overrideType] ?? 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                )
                  .sort((a, b) => b[1] - a[1])[0]?.[0]
                  .replace(/_/g, " ") ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Intents Affected
              </div>
              <div className="text-[12.5px] font-medium">
                {
                  new Set(
                    learningEntries
                      .map((e) => e.context.intent)
                      .filter(Boolean)
                  ).size
                }{" "}
                types
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Learning Trend
              </div>
              <div className="text-[12.5px] font-medium flex items-center gap-1">
                {learningEntries.length > 5 ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-warning" />
                    Stabilizing
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                    Improving
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
