"use client";

import { useAppStore } from "@/store/appStore";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, RefreshCw, AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerPanel } from "./CustomerPanel";
import { ReasoningPanel } from "./ReasoningPanel";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { KnowledgeRetrieval } from "./KnowledgeRetrieval";
import { ResponseDraft } from "./ResponseDraft";
import { ActionDrawer } from "./ActionDrawer";
import { AuditTrail } from "./AuditTrail";
import { BusinessImpactPanel } from "./BusinessImpactPanel";
import { DecisionExplainerPanel } from "./DecisionExplainerPanel";
import { LearningHistoryPanel } from "./LearningHistoryPanel";
import { OverrideFeedbackDialog } from "./OverrideFeedbackDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { statusColor, urgencyColor, sentimentColor, intentLabel, channelLabel, formatRelativeTime } from "@/lib/utils/format";
import { MessageSquare, Mail, Smartphone } from "lucide-react";

const channelIcon = {
  chat: MessageSquare,
  email: Mail,
  whatsapp: Smartphone,
};

const STAGES = [
  { key: "classify", label: "Classify" },
  { key: "retrieve", label: "Retrieve" },
  { key: "plan", label: "Plan" },
  { key: "act", label: "Execute" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

interface TraceEntry {
  durationMs: number;
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  const setView = useAppStore((s) => s.setView);
  const cases = useAppStore((s) => s.cases);
  const customers = useAppStore((s) => s.customers);
  const orders = useAppStore((s) => s.orders);
  const upsertCaseLocal = useAppStore((s) => s.upsertCaseLocal);
  const setAudit = useAppStore((s) => s.setAudit);

  const caseRecord = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);
  const customer = useMemo(
    () => (caseRecord ? customers.find((c) => c.id === caseRecord.customerId) : undefined),
    [customers, caseRecord]
  );
  const order = useMemo(
    () => (caseRecord ? orders.find((o) => o.id === caseRecord.orderId) : undefined),
    [orders, caseRecord]
  );

  const [running, setRunning] = useState(false);
  const [runningStage, setRunningStage] = useState<StageKey | "pipeline" | null>(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [showActionDrawer, setShowActionDrawer] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean;
    overrideType: "rejected_action" | "edited_draft" | "escalated_false_positive" | "forced_action" | "plan_modified" | "resolved_differently";
    originalDecision: { action?: string; planGoal?: string; confidence?: number; automationSafe?: boolean };
    humanDecision: { action?: string; note?: string };
    context: { intent?: string; sentiment?: string; urgency?: string; orderTotalCents?: number; policyCodes?: string[] };
  } | null>(null);

  function showOverrideDialog(
    overrideType: "rejected_action" | "edited_draft" | "escalated_false_positive" | "forced_action" | "plan_modified" | "resolved_differently",
    originalDecision: { action?: string; planGoal?: string; confidence?: number; automationSafe?: boolean },
    humanDecision: { action?: string; note?: string }
  ) {
    if (!caseRecord) return;
    setOverrideDialog({
      open: true,
      overrideType,
      originalDecision,
      humanDecision,
      context: {
        intent: caseRecord.intent,
        sentiment: caseRecord.sentiment,
        urgency: caseRecord.urgency,
        orderTotalCents: order?.totalCents,
        policyCodes: caseRecord.retrievalHits?.filter((h) => h.source === "policy").map((h) => h.title.split(" — ")[0]) ?? [],
      },
    });
  }

  async function refreshAuditSafe() {
    try {
      const res = await fetch("/api/ingest", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audit) setAudit(data.audit);
    } catch (err) {
      console.error("[refreshAudit] failed:", err);
    }
  }

  async function runPipeline() {
    setRunning(true);
    setRunningStage("pipeline");
    setStageIndex(0);
    try {
      // Visually step through stages for demo clarity
      for (let i = 0; i < STAGES.length; i++) {
        setStageIndex(i);
        await new Promise((r) => setTimeout(r, 380));
      }
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Pipeline failed");
      upsertCaseLocal(data.case);
      await refreshAuditSafe();
      setStageIndex(-1);
      if (data.status === "resolved") {
        const totalMs = data.trace
          ? (data.trace as TraceEntry[]).reduce((a, t) => a + t.durationMs, 0)
          : 0;
        toast.success("Case auto-resolved", {
          description: `Pipeline completed in ${totalMs}ms`,
        });
      } else if (data.status === "escalated") {
        toast.warning("Case escalated to human queue", {
          description: "Some steps require human approval.",
        });
      } else {
        toast.info("Pipeline progressed", {
          description: `Status: ${data.status}`,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Pipeline failed", {
        description: err instanceof Error ? err.message : "See audit log for details.",
      });
      setStageIndex(-1);
    } finally {
      setRunning(false);
      setRunningStage(null);
    }
  }

  async function runStage(stage: StageKey) {
    setRunning(true);
    setRunningStage(stage);
    try {
      const res = await fetch(`/api/${stage}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Stage failed");
      if (data.case) upsertCaseLocal(data.case);
      await refreshAuditSafe();
      toast.success(`${stage} complete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stage failed");
    } finally {
      setRunning(false);
      setRunningStage(null);
    }
  }

  async function escalate() {
    setRunning(true);
    setRunningStage("pipeline");
    try {
      const res = await fetch("/api/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, reason: "Manual escalation by agent" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Escalation failed");
      upsertCaseLocal(data.case);
      await refreshAuditSafe();
      toast.warning("Escalated to human queue", {
        description: `Priority: ${data.summary.priority}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Escalation failed");
    } finally {
      setRunning(false);
      setRunningStage(null);
    }
  }

  if (!caseRecord || !customer) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setView("inbox")} className="mb-3">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to inbox
        </Button>
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">
          Case not found. It may have been deleted or reset.
        </div>
      </div>
    );
  }

  const status = statusColor(caseRecord.status);
  const ChannelIcon = channelIcon[caseRecord.channel];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-[1600px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("inbox")}
            className="h-8 text-[12px] text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Inbox
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold tracking-tight">{caseRecord.caseNumber}</span>
              <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md", status.bg, status.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
              {caseRecord.urgency && (
                <span className={cn("inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-md", urgencyColor(caseRecord.urgency).bg, urgencyColor(caseRecord.urgency).text)}>
                  {urgencyColor(caseRecord.urgency).label}
                </span>
              )}
              {caseRecord.automationSafe === false && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-2.5 h-2.5" /> Not auto-safe
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              {customer.name} · {channelLabel(caseRecord.channel)} · {formatRelativeTime(caseRecord.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Pipeline progress indicator — desktop */}
          {running && stageIndex >= 0 && (
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md transition-colors",
                      i < stageIndex && "bg-success/10 text-success",
                      i === stageIndex && "bg-foreground/8 text-foreground",
                      i > stageIndex && "bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {i < stageIndex ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : i === stageIndex ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                    )}
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline progress indicator — mobile (compact) */}
          {running && stageIndex >= 0 && (
            <div className="sm:hidden flex items-center gap-1 text-[10.5px] text-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              {STAGES[stageIndex].label}…
            </div>
          )}

          {caseRecord.status === "new" && (
            <Button
              size="sm"
              onClick={runPipeline}
              disabled={running}
              className="h-8 text-[12px] gap-1.5"
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Auto-resolve
            </Button>
          )}

          {caseRecord.status !== "new" && caseRecord.status !== "resolved" && caseRecord.status !== "escalated" && (
            <Button
              size="sm"
              variant="outline"
              onClick={runPipeline}
              disabled={running}
              className="h-8 text-[12px] gap-1.5"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Continue pipeline
            </Button>
          )}

          {caseRecord.status !== "escalated" && caseRecord.status !== "resolved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={escalate}
              disabled={running}
              className="h-8 text-[12px] gap-1.5 text-destructive hover:text-destructive"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escalate</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowActionDrawer(true)}
            disabled={running}
            className="h-8 text-[12px] gap-1.5"
          >
            Actions
          </Button>
        </div>
      </div>

      {/* Main grid: 3 columns */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
        {/* Left: Customer + Order + Business Impact + Learning History */}
        <div className="space-y-3">
          <CustomerPanel customer={customer} order={order} />
          <KnowledgeRetrieval hits={caseRecord.retrievalHits ?? []} />
          {caseRecord.intent && (
            <BusinessImpactPanel
              caseRecord={caseRecord}
              primaryAction={caseRecord.resolutionPlan?.workflowSteps[0]?.action ?? "send_response"}
            />
          )}
          <LearningHistoryPanel caseId={caseRecord.id} intent={caseRecord.intent} />
        </div>

        {/* Center: Case message + reasoning + workflow + response */}
        <div className="space-y-3 min-w-0">
          {/* Original message */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <ChannelIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium">Customer message</span>
              <span className="text-[10.5px] text-muted-foreground ml-auto">{formatRelativeTime(caseRecord.createdAt)}</span>
            </div>
            <div className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {caseRecord.message}
            </div>
            {caseRecord.intent && (
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider mr-1">Detected:</span>
                <Badge variant="outline" className="text-[10.5px] h-5 font-medium">
                  {intentLabel(caseRecord.intent)}
                </Badge>
                {caseRecord.sentiment && (
                  <Badge variant="outline" className={cn("text-[10.5px] h-5 font-medium", sentimentColor(caseRecord.sentiment).text)}>
                    {sentimentColor(caseRecord.sentiment).label}
                  </Badge>
                )}
                {caseRecord.confidence != null && (
                  <Badge variant="outline" className="text-[10.5px] h-5 font-mono">
                    {(caseRecord.confidence * 100).toFixed(0)}% conf
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* AI reasoning */}
          <ReasoningPanel caseRecord={caseRecord} />

          {/* Decision Explainer — Why this action? */}
          {caseRecord.intent && <DecisionExplainerPanel caseRecord={caseRecord} />}

          {/* Workflow timeline */}
          <WorkflowTimeline
            caseRecord={caseRecord}
            onRunStage={runStage}
            running={running}
            runningStage={runningStage}
          />

          {/* Response draft */}
          {caseRecord.responseDraft && caseRecord.status !== "escalated" && (
            <ResponseDraft draft={caseRecord.responseDraft} caseId={caseRecord.id} />
          )}

          {/* Escalation notice */}
          {caseRecord.status === "escalated" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-[13px] font-semibold text-destructive">Escalated to human queue</span>
              </div>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                {caseRecord.escalationReason ?? "Case requires human review."}
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Assigned to: {caseRecord.assignedAgent ?? "Senior Agent Pool"} · ETA 8 business hours
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowActionDrawer(true)}
                  className="h-7 text-[11px]"
                >
                  Take action
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/resolve", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ caseId: caseRecord.id, note: "Manually resolved from escalation queue" }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error ?? "Failed");
                      upsertCaseLocal(data.case);
                      await refreshAuditSafe();
                      toast.success("Case marked resolved");
                      // Record the override — manager resolved an escalated case
                      showOverrideDialog("escalated_false_positive", {
                        action: "escalate",
                        planGoal: caseRecord.resolutionPlan?.goal,
                        confidence: caseRecord.confidence,
                        automationSafe: false,
                      }, {
                        action: "resolve",
                        note: "Manager resolved directly — escalation was unnecessary",
                      });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to resolve");
                    }
                  }}
                  className="h-7 text-[11px] text-success hover:text-success"
                >
                  Mark resolved
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Audit trail */}
        <div className="space-y-3">
          <AuditTrail caseId={caseRecord.id} />
        </div>
      </div>

      <ActionDrawer
        open={showActionDrawer}
        onOpenChange={setShowActionDrawer}
        caseRecord={caseRecord}
      />

      {overrideDialog && (
        <OverrideFeedbackDialog
          open={overrideDialog.open}
          onOpenChange={(open) => setOverrideDialog((prev) => prev ? { ...prev, open } : null)}
          caseId={caseRecord.id}
          overrideType={overrideDialog.overrideType}
          originalDecision={overrideDialog.originalDecision}
          humanDecision={overrideDialog.humanDecision}
          context={overrideDialog.context}
        />
      )}
    </div>
  );
}
