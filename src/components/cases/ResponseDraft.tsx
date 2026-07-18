"use client";

import { motion } from "framer-motion";
import { Mail, Copy, Check, Send, RefreshCw, Loader2, Pencil, X, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

interface Props {
  draft: string;
  caseId: string;
}

export function ResponseDraft({ draft, caseId }: Props) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(draft);
  const upsertCaseLocal = useAppStore((s) => s.upsertCaseLocal);

  const currentDraft = editing ? editText : draft;

  function copy() {
    navigator.clipboard.writeText(currentDraft);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to regenerate");
      upsertCaseLocal(data.case);
      setEditText(data.draft);
      toast.success("Response regenerated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  }

  function saveEdit() {
    // Update the case locally with the edited draft
    const store = useAppStore.getState();
    const caseRecord = store.cases.find((c) => c.id === caseId);
    if (caseRecord) {
      upsertCaseLocal({ ...caseRecord, responseDraft: editText, updatedAt: new Date().toISOString() });
    }
    setEditing(false);
    toast.success("Response updated");
  }

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, action: "send_response" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");
      if (data.case) upsertCaseLocal(data.case);
      // Refresh audit
      try {
        const auditRes = await fetch("/api/ingest", { cache: "no-store" });
        if (auditRes.ok) {
          const ad = await auditRes.json();
          useAppStore.getState().setAudit(ad.audit);
        }
      } catch {
        // ignore audit refresh failure
      }
      setSent(true);
      toast.success("Response sent to customer", {
        description: `Delivered via the original case channel.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const wordCount = currentDraft.split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <Mail className="w-3.5 h-3.5 text-info" />
        <span className="text-[12px] font-semibold">Customer Response Draft</span>
        <span className="ml-auto text-[10.5px] text-muted-foreground">
          {sent ? "Sent" : "AI-generated · review before sending"}
        </span>
      </div>

      <div className="p-4">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[180px] text-[12.5px] leading-relaxed resize-y"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveEdit} className="h-7 text-[11px] gap-1">
                <Save className="w-3 h-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditText(draft);
                  setEditing(false);
                }}
                className="h-7 text-[11px] gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border border-border bg-muted/30 p-3 text-[12.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans"
            contentEditable={false}
          >
            {currentDraft}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="text-[10.5px] text-muted-foreground">
            {wordCount} words · ~{Math.ceil(wordCount / 200 * 60)}s read
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
              className="h-8 text-[12px] gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {!editing && !sent && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="h-8 text-[12px] gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  disabled={regenerating}
                  className="h-8 text-[12px] gap-1"
                >
                  {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerate
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={send}
              disabled={sent || sending || editing}
              className={cn("h-8 text-[12px] gap-1.5", sent && "bg-success hover:bg-success")}
            >
              {sending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : sent ? (
                <Check className="w-3 h-3" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {sent ? "Sent" : sending ? "Sending…" : "Send to customer"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
