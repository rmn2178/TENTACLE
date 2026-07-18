"use client";

import { useAppStore } from "@/store/appStore";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Clock, User, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime, intentLabel, sentimentColor, urgencyColor } from "@/lib/utils/format";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AGENTS = [
  "Avery Kim",
  "Bennett Cho",
  "Priya Raman",
  "Marcus Webb",
  "Sofia Lindqvist",
];

export function EscalationQueueView() {
  const allCases = useAppStore((s) => s.cases);
  const allCustomers = useAppStore((s) => s.customers);
  const allOrders = useAppStore((s) => s.orders);
  const cases = useMemo(
    () => allCases.filter((c) => c.status === "escalated"),
    [allCases]
  );

  const openCase = useAppStore((s) => s.openCase);
  const upsertCaseLocal = useAppStore((s) => s.upsertCaseLocal);
  const setAudit = useAppStore((s) => s.setAudit);
  const [resolving, setResolving] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function refreshAudit() {
    try {
      const res = await fetch("/api/ingest", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audit) setAudit(data.audit);
    } catch (err) {
      console.error("[refreshAudit] failed:", err);
    }
  }

  async function resolveManually(caseId: string) {
    setResolving(caseId);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          note: "Manually resolved from escalation queue",
          agentName: "Avery Kim",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to resolve");
      upsertCaseLocal(data.case);
      await refreshAudit();
      toast.success("Case resolved", {
        description: "Customer will be notified of the resolution.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setResolving(null);
    }
  }

  async function assignAgent(caseId: string, agent: string) {
    setAssigning(caseId);
    try {
      // Update case locally with assigned agent
      const caseRecord = allCases.find((c) => c.id === caseId);
      if (!caseRecord) return;
      const updated = { ...caseRecord, assignedAgent: agent, updatedAt: new Date().toISOString() };
      upsertCaseLocal(updated);

      // Log to audit
      const customer = allCustomers.find((c) => c.id === caseRecord.customerId);
      const res = await fetch("/api/ingest", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.audit) setAudit(data.audit);
      }
      toast.success(`Assigned to ${agent}`, {
        description: `${caseRecord.caseNumber} · ${customer?.name ?? ""}`,
      });
    } catch (err) {
      toast.error("Failed to assign agent");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Escalation Queue</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {cases.length} case{cases.length !== 1 ? "s" : ""} awaiting human review
          </p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-4 h-4 text-success" />
          </div>
          <div className="text-[13px] font-medium">Escalation queue is empty</div>
          <div className="text-[12px] text-muted-foreground mt-1">
            All cases are being handled autonomously. Escalations will appear here when the AI detects furious sentiment, high-value disputes, or unsafe-to-automate cases.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cases.map((c, i) => {
            const customer = allCustomers.find((cu) => cu.id === c.customerId);
            const order = allOrders.find((o) => o.id === c.orderId);
            const urgency = urgencyColor(c.urgency ?? "medium");
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-destructive/25 bg-card overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2 border-b border-destructive/15 bg-destructive/[0.03]">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[12px] font-semibold">{c.caseNumber}</span>
                  <span className="text-[10.5px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{customer?.name}</span>
                  <span className={cn("ml-auto inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded", urgency.bg, urgency.text)}>
                    {urgency.label}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-[12.5px] font-medium">{c.subject}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-1 line-clamp-2">
                      {c.message}
                    </div>
                  </div>

                  {c.escalationReason && (
                    <div className="rounded-md bg-destructive/[0.06] border border-destructive/20 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-destructive font-medium mb-0.5">
                        Escalation reason
                      </div>
                      <div className="text-[11.5px] text-foreground/90">{c.escalationReason}</div>
                    </div>
                  )}

                  {/* AI summary */}
                  {c.resolutionPlan && (
                    <div className="rounded-md bg-muted/40 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                        AI Summary
                      </div>
                      <div className="text-[11px] text-foreground/80 leading-relaxed">
                        Intent: {intentLabel(c.intent ?? "general_inquiry")} · Sentiment:{" "}
                        {c.sentiment && sentimentColor(c.sentiment).label} · Confidence:{" "}
                        {((c.confidence ?? 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {c.resolutionPlan.approach}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Escalated {formatRelativeTime(c.updatedAt)}
                    </span>
                    {order && <span className="font-mono">{order.orderNumber}</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCase(c.id)}
                      className="h-7 text-[11px] gap-1"
                    >
                      View case <ArrowRight className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolveManually(c.id)}
                      disabled={resolving === c.id}
                      className="h-7 text-[11px] gap-1"
                    >
                      {resolving === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      {resolving === c.id ? "Resolving…" : "Resolve"}
                    </Button>
                    <div className="ml-auto flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <Select
                        value={c.assignedAgent ?? ""}
                        onValueChange={(v) => assignAgent(c.id, v)}
                        disabled={assigning === c.id}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-[10.5px] border-dashed">
                          <SelectValue placeholder={c.assignedAgent ?? "Assign…"} />
                        </SelectTrigger>
                        <SelectContent>
                          {AGENTS.map((a) => (
                            <SelectItem key={a} value={a} className="text-[11px]">
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
