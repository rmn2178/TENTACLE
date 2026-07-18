"use client";

import { useAppStore } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Mail,
  PhoneCall,
  CreditCard,
  PackageCheck,
  MapPin,
  XCircle,
  Sparkles,
  Send,
  DollarSign,
} from "lucide-react";
import type { CaseRecord } from "@/types";
import { cn } from "@/lib/utils";

type ActionKey =
  | "run_pipeline"
  | "send_response"
  | "callback"
  | "refund"
  | "replacement"
  | "address"
  | "cancel"
  | "escalate";

interface ActionItem {
  key: ActionKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "outline" | "destructive";
  requiresConfirm?: boolean;
  requiresInput?: "amount" | "address" | "note";
}

const ACTIONS: ActionItem[] = [
  {
    key: "run_pipeline",
    label: "Run AI pipeline",
    description: "Auto-classify, retrieve context, plan, and execute safe actions.",
    icon: Sparkles,
    variant: "default",
  },
  {
    key: "send_response",
    label: "Send draft response",
    description: "Send the AI-drafted response to the customer via their original channel.",
    icon: Mail,
    variant: "outline",
  },
  {
    key: "callback",
    label: "Schedule callback",
    description: "Schedule a phone callback within 4 business hours.",
    icon: PhoneCall,
    variant: "outline",
  },
  {
    key: "refund",
    label: "Issue refund",
    description: "Issue a full or partial refund to the original payment method.",
    icon: CreditCard,
    variant: "outline",
    requiresConfirm: true,
    requiresInput: "amount",
  },
  {
    key: "replacement",
    label: "Dispatch replacement",
    description: "Queue a replacement order for immediate fulfillment.",
    icon: PackageCheck,
    variant: "outline",
    requiresConfirm: true,
  },
  {
    key: "address",
    label: "Update shipping address",
    description: "Update the shipping address before carrier pickup.",
    icon: MapPin,
    variant: "outline",
    requiresConfirm: true,
    requiresInput: "address",
  },
  {
    key: "cancel",
    label: "Cancel order",
    description: "Cancel the order and issue a full refund.",
    icon: XCircle,
    variant: "destructive",
    requiresConfirm: true,
  },
  {
    key: "escalate",
    label: "Escalate to human",
    description: "Move this case to the human escalation queue with AI summary attached.",
    icon: AlertTriangle,
    variant: "destructive",
  },
];

const API_ACTION_MAP: Record<ActionKey, string> = {
  run_pipeline: "state",
  send_response: "action",
  callback: "action",
  refund: "action",
  replacement: "action",
  address: "action",
  cancel: "action",
  escalate: "escalate",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseRecord: CaseRecord;
}

export function ActionDrawer({ open, onOpenChange, caseRecord }: Props) {
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [confirmKey, setConfirmKey] = useState<ActionKey | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const upsertCaseLocal = useAppStore((s) => s.upsertCaseLocal);
  const setAudit = useAppStore((s) => s.setAudit);

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

  async function handleAction(key: ActionKey) {
    setPending(key);
    try {
      let res: Response;
      const body: Record<string, unknown> = { caseId: caseRecord.id };

      if (key === "run_pipeline") {
        res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: caseRecord.id }),
        });
      } else if (key === "escalate") {
        res = await fetch("/api/escalate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: caseRecord.id }),
        });
      } else {
        // Map to /api/action
        const actionMap: Record<ActionKey, string> = {
          run_pipeline: "send_response",
          send_response: "send_response",
          callback: "schedule_callback",
          refund: "refund",
          replacement: "replacement",
          address: "address_update",
          cancel: "cancel",
          escalate: "escalate",
        };
        body.action = actionMap[key];
        if (key === "refund" && inputValues.amount) {
          body.amount = parseFloat(inputValues.amount);
        }
        if (key === "address" && inputValues.address) {
          body.address = inputValues.address;
        }
        if (inputValues.note) {
          body.note = inputValues.note;
        }
        res = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Action failed");

      if (data.case) upsertCaseLocal(data.case);
      await refreshAudit();

      const actionLabel = ACTIONS.find((a) => a.key === key)?.label ?? key;
      if (key === "escalate") {
        toast.warning("Escalated to human queue");
      } else if (data.status === "resolved") {
        toast.success(`${actionLabel} — case resolved`);
      } else {
        toast.success(`${actionLabel} executed`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(null);
      setConfirmKey(null);
      setInputValues({});
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[440px] sm:max-w-[440px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-[15px]">Quick Actions</SheetTitle>
          <SheetDescription className="text-[12px]">
            {caseRecord.caseNumber} · {caseRecord.subject}
          </SheetDescription>
        </SheetHeader>

        <div className="p-3 space-y-1.5">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const isPending = pending === action.key;
            const isConfirm = confirmKey === action.key;
            return (
              <div key={action.key}>
                <AnimatePresence mode="wait">
                  {isConfirm ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "rounded-lg border p-3 space-y-3",
                        action.variant === "destructive"
                          ? "border-destructive/30 bg-destructive/[0.04]"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div>
                        <div className="text-[12px] font-semibold mb-1 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          Confirm {action.label.toLowerCase()}?
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {action.description}
                        </div>
                      </div>

                      {/* Input fields */}
                      {action.requiresInput === "amount" && (
                        <div>
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Refund amount (USD)
                          </Label>
                          <div className="relative mt-1">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Full refund"
                              value={inputValues.amount ?? ""}
                              onChange={(e) =>
                                setInputValues((v) => ({ ...v, amount: e.target.value }))
                              }
                              className="h-8 pl-7 text-[12px]"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Leave empty for a full refund of the order total.
                          </p>
                        </div>
                      )}

                      {action.requiresInput === "address" && (
                        <div>
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            New shipping address
                          </Label>
                          <Textarea
                            placeholder="123 Main St, Apt 4B&#10;San Francisco, CA 94102"
                            value={inputValues.address ?? ""}
                            onChange={(e) =>
                              setInputValues((v) => ({ ...v, address: e.target.value }))
                            }
                            className="mt-1 min-h-[60px] text-[12px]"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Agent note (optional)
                        </Label>
                        <Input
                          placeholder="Reason for action…"
                          value={inputValues.note ?? ""}
                          onChange={(e) =>
                            setInputValues((v) => ({ ...v, note: e.target.value }))
                          }
                          className="mt-1 h-8 text-[12px]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={action.variant === "destructive" ? "destructive" : "default"}
                          onClick={() => handleAction(action.key)}
                          disabled={isPending}
                          className="h-7 text-[11px] gap-1"
                        >
                          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setConfirmKey(null);
                            setInputValues({});
                          }}
                          className="h-7 text-[11px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="action"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        if (action.requiresConfirm) setConfirmKey(action.key);
                        else handleAction(action.key);
                      }}
                      disabled={pending !== null}
                      className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 disabled:opacity-50 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                          action.variant === "destructive"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Icon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium">{action.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {action.description}
                        </div>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Actions are logged to the audit trail with actor, timestamp, and result.
            Financial actions update the case status and operational metrics.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
