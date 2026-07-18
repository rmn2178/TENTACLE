"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import type { OverrideType, RecordOverrideInput } from "@/types/learning";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  overrideType: OverrideType;
  originalDecision: RecordOverrideInput["originalDecision"];
  humanDecision: RecordOverrideInput["humanDecision"];
  context: RecordOverrideInput["context"];
  onRecorded?: () => void;
}

const overrideTypeLabels: Record<OverrideType, { title: string; description: string; placeholder: string }> = {
  rejected_action: {
    title: "Why did you reject this action?",
    description: "Your feedback helps the AI learn when NOT to propose this action for similar cases.",
    placeholder: "e.g., The customer explicitly said they wanted a replacement, not a refund...",
  },
  edited_draft: {
    title: "Why did you edit the response?",
    description: "Your edits help the AI generate better responses for similar cases in the future.",
    placeholder: "e.g., The AI's tone was too formal for this customer...",
  },
  escalated_false_positive: {
    title: "Why was this escalation unnecessary?",
    description: "Your feedback helps the AI avoid over-escalating similar cases.",
    placeholder: "e.g., The customer wasn't actually angry, just confused...",
  },
  forced_action: {
    title: "Why did you force this action?",
    description: "Your override helps the AI learn when to trust automation for similar cases.",
    placeholder: "e.g., I verified the customer's story and the refund is justified...",
  },
  plan_modified: {
    title: "Why did you modify the plan?",
    description: "Your changes help the AI generate better plans for similar cases.",
    placeholder: "e.g., Added an extra step to follow up with the customer...",
  },
  resolved_differently: {
    title: "Why did you resolve this differently?",
    description: "Your resolution helps the AI learn the preferred outcome for similar cases.",
    placeholder: "e.g., Resolved with a partial refund instead of full...",
  },
};

export function OverrideFeedbackDialog({
  open,
  onOpenChange,
  caseId,
  overrideType,
  originalDecision,
  humanDecision,
  context,
  onRecorded,
}: Props) {
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prependLearningEntry = useAppStore((s) => s.prependLearningEntry);

  const config = overrideTypeLabels[overrideType];

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          overrideType,
          originalDecision,
          humanDecision,
          context,
          feedbackNote: feedbackNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to record override");

      prependLearningEntry(data.entry);

      // Refresh audit
      try {
        const auditRes = await fetch("/api/ingest", { cache: "no-store" });
        if (auditRes.ok) {
          const ad = await auditRes.json();
          useAppStore.getState().setAudit(ad.audit);
          useAppStore.getState().setLearningEntries(ad.learningEntries ?? []);
        }
      } catch {
        // non-critical
      }

      toast.success("Learning recorded", {
        description: "The AI will use this feedback for future similar cases.",
      });

      setFeedbackNote("");
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record override");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    onOpenChange(false);
    onRecorded?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Record learning feedback</DialogTitle>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-gradient-to-r from-violet-500/[0.06] to-transparent">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-[14px] font-semibold">Record Learning Feedback</span>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-[14px] font-medium mb-1">{config.title}</div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{config.description}</p>
          </div>

          {/* Summary of what changed */}
          <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5 text-[11px]">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[9px] w-16 shrink-0 mt-0.5">
                AI Proposed
              </span>
              <span className="text-foreground/80">
                {originalDecision.action ?? originalDecision.planGoal ?? "—"}
                {originalDecision.confidence != null && (
                  <span className="text-muted-foreground ml-1">
                    ({(originalDecision.confidence * 100).toFixed(0)}% conf)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[9px] w-16 shrink-0 mt-0.5">
                You Chose
              </span>
              <span className="text-foreground/80">
                {humanDecision.action ?? "—"}
                {humanDecision.note && (
                  <span className="text-muted-foreground ml-1">({humanDecision.note})</span>
                )}
              </span>
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Feedback Note (optional)
            </Label>
            <Textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder={config.placeholder}
              className="mt-1.5 min-h-[80px] text-[12.5px] resize-y"
              maxLength={1000}
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              {feedbackNote.length}/1000 characters
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={submitting}
              className="h-8 text-[12px]"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-8 text-[12px] gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {submitting ? "Recording…" : "Record Learning"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
