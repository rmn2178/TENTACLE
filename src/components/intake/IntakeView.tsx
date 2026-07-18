"use client";

import { useAppStore } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, Sparkles, Send, Loader2, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SAMPLE_MESSAGES = [
  {
    label: "Order delay",
    subject: "Where is my order?",
    message:
      "Hi, my order was supposed to arrive 3 days ago and tracking hasn't updated. I really need these items before my event this weekend. Can someone help?",
    channel: "chat" as const,
  },
  {
    label: "Damaged item",
    subject: "Item arrived damaged",
    message:
      "The lamp I ordered arrived completely shattered. The box looked fine on the outside but inside was a disaster. I'd like a replacement please.",
    channel: "email" as const,
  },
  {
    label: "Refund request",
    subject: "Please refund my order",
    message: "Hi, I'd like to return the basket I bought last week for a refund. It doesn't fit my space.",
    channel: "whatsapp" as const,
  },
  {
    label: "Furious customer",
    subject: "This is unacceptable",
    message:
      "I am FURIOUS. I spent $900 on a rug that arrived torn in half. I have guests tomorrow. If this isn't fixed today I'm doing a chargeback and reporting you to my credit card company.",
    channel: "email" as const,
  },
  {
    label: "Wrong product",
    subject: "Wrong color received",
    message:
      "I ordered the mug set in sand but received blue ones. Please send the correct color and let me know how to return these.",
    channel: "whatsapp" as const,
  },
  {
    label: "Address correction",
    subject: "Need to change address",
    message:
      "I just placed an order but realized I used my old address. Can you update it before it ships? Order should still be in processing.",
    channel: "chat" as const,
  },
];

const channelIcon = {
  chat: MessageSquare,
  email: Mail,
  whatsapp: Smartphone,
};

export function IntakeView() {
  const customers = useAppStore((s) => s.customers);
  const orders = useAppStore((s) => s.orders);
  const upsertCaseLocal = useAppStore((s) => s.upsertCaseLocal);
  const setAudit = useAppStore((s) => s.setAudit);
  const openCase = useAppStore((s) => s.openCase);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"chat" | "email" | "whatsapp">("chat");
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  async function submit(autoResolve: boolean) {
    if (message.trim().length < 5) {
      toast.error("Message must be at least 5 characters");
      return;
    }
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, channel, customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to ingest");
      upsertCaseLocal(data.case);

      // Refresh audit log
      try {
        const auditRes = await fetch("/api/ingest", { cache: "no-store" });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAudit(auditData.audit);
        }
      } catch {
        // non-critical
      }

      if (autoResolve) {
        // Immediately run the AI pipeline
        const stateRes = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: data.case.id }),
        });
        const stateData = await stateRes.json();
        if (!stateRes.ok) {
          throw new Error(stateData?.error ?? "Auto-resolve failed — case was created but pipeline did not complete");
        }
        upsertCaseLocal(stateData.case);
        try {
          const auditRefresh = await fetch("/api/ingest", { cache: "no-store" });
          if (auditRefresh.ok) {
            const ad = await auditRefresh.json();
            setAudit(ad.audit);
          }
        } catch {
          // non-critical
        }
        if (stateData.status === "resolved") {
          toast.success("Case created and auto-resolved", {
            description: `Status: ${stateData.status}`,
          });
        } else if (stateData.status === "escalated") {
          toast.warning("Case created and escalated", {
            description: "AI flagged this case for human review.",
          });
        } else {
          toast.info("Case created and pipeline progressed", {
            description: `Status: ${stateData.status}`,
          });
        }
      } else {
        toast.success("Case created", { description: data.case.caseNumber });
      }

      setJustCreated(data.case.id);
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setSubmitting(false);
    }
  }

  function applySample(s: (typeof SAMPLE_MESSAGES)[number]) {
    setSubject(s.subject);
    setMessage(s.message);
    setChannel(s.channel);
  }

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedCustomerOrders = orders.filter((o) => o.customerId === customerId);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">New Intake</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Simulate an inbound customer message and watch the copilot process it end-to-end
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
        {/* Compose form */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquarePlus className="w-3.5 h-3.5 text-info" />
            <span className="text-[13px] font-semibold">Compose message</span>
          </div>

          <div className="space-y-4">
            {/* Channel + customer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Channel</Label>
                <div className="flex items-center gap-1 mt-1.5">
                  {(["chat", "email", "whatsapp"] as const).map((c) => {
                    const Icon = channelIcon[c];
                    return (
                      <button
                        key={c}
                        onClick={() => setChannel(c)}
                        className={cn(
                          "flex-1 h-8 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors capitalize",
                          channel === c
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:bg-muted/40"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="mt-1.5 h-8 text-[12px] bg-background w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[12px]">
                        {c.name} · {c.tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject line"
                className="mt-1.5 h-9 text-[13px]"
              />
            </div>

            {/* Message */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste or type the customer's message…"
                className="mt-1.5 min-h-[180px] text-[13px] leading-relaxed resize-y"
              />
              <div className="text-[10.5px] text-muted-foreground mt-1">
                {message.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => submit(false)}
                disabled={submitting || message.trim().length < 5}
                variant="outline"
                className="h-9 text-[12.5px] gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Create case
              </Button>
              <Button
                onClick={() => submit(true)}
                disabled={submitting || message.trim().length < 5}
                className="h-9 text-[12.5px] gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create &amp; auto-resolve
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Sample messages + customer preview */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2.5">
              Quick examples
            </div>
            <div className="space-y-1.5">
              {SAMPLE_MESSAGES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applySample(s)}
                  className="w-full text-left px-2.5 py-2 rounded-md border border-border bg-background hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-medium">{s.label}</span>
                    <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground ml-auto">
                      {s.channel}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-1">
                    {s.message}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Customer context */}
          {selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2.5">
                Customer context
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${selectedCustomer.avatarHue} 60% 55%), hsl(${selectedCustomer.avatarHue + 30} 65% 45%))`,
                  }}
                >
                  {selectedCustomer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium truncate">{selectedCustomer.name}</div>
                  <div className="text-[10.5px] text-muted-foreground capitalize">{selectedCustomer.tier} tier · ${selectedCustomer.lifetimeValue.toFixed(0)} LTV</div>
                </div>
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                {selectedCustomerOrders.length} order(s) on file
              </div>
            </motion.div>
          )}

          {/* Just created */}
          <AnimatePresence>
            {justCreated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-xl border border-success/30 bg-success/[0.04] p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[12px] font-semibold text-success">Case created</span>
                </div>
                <p className="text-[11.5px] text-foreground/80 mb-2.5">
                  The copilot has ingested the message and is ready to process it.
                </p>
                <Button
                  size="sm"
                  onClick={() => openCase(justCreated)}
                  className="h-8 text-[12px] w-full"
                >
                  Open case →
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
