"use client";

import { useAppStore } from "@/store/appStore";
import { motion } from "framer-motion";
import { Shield, Sliders, Brain, Save, RefreshCw, Loader2, Check, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AppSettings, ResponseTone } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

export function SettingsView() {
  const policies = useAppStore((s) => s.policies);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setData = useAppStore((s) => s.setData);

  const [local, setLocal] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Sync local state when server settings change
  useEffect(() => {
    setLocal(settings);
    setDirty(false);
  }, [settings]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      setSettings(data.settings);
      setDirty(false);
      toast.success("Settings saved", {
        description: "All automation thresholds and rules updated.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    try {
      // Reset settings to defaults
      const settingsRes = await fetch("/api/settings", { method: "DELETE" });
      if (settingsRes.ok) {
        const sd = await settingsRes.json();
        setSettings(sd.settings);
      }
      // Reset demo data
      const dataRes = await fetch("/api/reset", { method: "POST" });
      if (!dataRes.ok) throw new Error("Reset failed");
      const data = await dataRes.json();
      setData({
        cases: data.cases,
        customers: data.customers,
        orders: data.orders,
        policies: data.policies,
        audit: data.audit,
        metrics: data.metrics,
      });
      toast.success("Demo data reset", {
        description: "All cases, audit logs, and settings restored to defaults.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1000px] mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Configure automation thresholds, escalation rules, and AI behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10.5px] text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={resetting}
            className="h-8 text-[12px] gap-1.5"
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reset demo
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !dirty}
            className="h-8 text-[12px] gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Automation thresholds */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-3.5 h-3.5 text-info" />
            <span className="text-[13px] font-semibold">Automation Thresholds</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[12px]">Auto-refund limit</Label>
                <span className="text-[12px] font-medium tnum">₹{local.autoRefundLimit}</span>
              </div>
              <Slider
                value={[local.autoRefundLimit]}
                onValueChange={(v) => update("autoRefundLimit", v[0])}
                min={5}
                max={500}
                step={5}
              />
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                Refunds at or below this amount can be auto-issued without manager approval.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[12px]">Auto-resolve under</Label>
                <span className="text-[12px] font-medium tnum">₹{local.autoResolveUnder}</span>
              </div>
              <Slider
                value={[local.autoResolveUnder]}
                onValueChange={(v) => update("autoResolveUnder", v[0])}
                min={10}
                max={500}
                step={5}
              />
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                Cases involving orders below this value are eligible for full autonomous resolution.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[12px]">Manager approval above</Label>
                <span className="text-[12px] font-medium tnum">₹{local.requireApprovalAbove}</span>
              </div>
              <Slider
                value={[local.requireApprovalAbove]}
                onValueChange={(v) => update("requireApprovalAbove", v[0])}
                min={50}
                max={1000}
                step={25}
              />
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                Refunds above this amount require manager approval before execution.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Escalation rules */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-3.5 h-3.5 text-warning" />
            <span className="text-[13px] font-semibold">Escalation Rules</span>
          </div>

          <div className="space-y-3">
            <RuleToggle
              label="Escalate furious sentiment"
              description="Forward cases with furious sentiment to the senior agent queue."
              checked={local.escalateFurious}
              onCheckedChange={(v) => update("escalateFurious", v)}
            />
            <div className="h-px bg-border" />
            <RuleToggle
              label="Escalate high-value orders"
              description={`Orders above ₹${local.highValueThreshold} require manager approval before any financial action.`}
              checked={local.escalateHighValue}
              onCheckedChange={(v) => update("escalateHighValue", v)}
            />
            <div className="h-px bg-border" />
            <div>
              <Label className="text-[12px]">High-value threshold (INR)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  value={local.highValueThreshold}
                  onChange={(e) => update("highValueThreshold", Number(e.target.value) || 0)}
                  className="h-8 text-[12px]"
                />
                <span className="text-[11px] text-muted-foreground shrink-0">INR</span>
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                Orders at or above this value trigger automatic escalation when disputes arise.
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI behavior */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[13px] font-semibold">AI Behavior</span>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-[12px]">Response tone</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {([
                  { key: "warm_professional", label: "Warm" },
                  { key: "concise", label: "Concise" },
                  { key: "apologetic", label: "Apologetic" },
                ] as { key: ResponseTone; label: string }[]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => update("responseTone", t.key)}
                    className={cn(
                      "text-[11px] font-medium px-2 py-1.5 rounded-md border transition-colors",
                      local.responseTone === t.key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:bg-muted/40"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                Controls the tone of AI-generated customer responses.
              </p>
            </div>

            <div className="h-px bg-border" />

            <RuleToggle
              label="Always draft response"
              description="Generate a customer-facing response draft even when escalating."
              checked={local.alwaysDraftResponse}
              onCheckedChange={(v) => update("alwaysDraftResponse", v)}
            />
            <div className="h-px bg-border" />
            <RuleToggle
              label="Attach similar cases"
              description="Include resolved similar cases in the retrieval context."
              checked={local.attachSimilarCases}
              onCheckedChange={(v) => update("attachSimilarCases", v)}
            />
          </div>
        </motion.div>

        {/* Active policies */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-semibold">Active Policies ({policies.length})</span>
            <span className="text-[10.5px] text-muted-foreground">
              {policies.filter((p) => p.autoResolve).length} auto-resolve ·{" "}
              {policies.filter((p) => !p.autoResolve).length} require review
            </span>
          </div>

          {policies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[12px] text-muted-foreground">No policies configured</div>
              <div className="text-[10.5px] text-muted-foreground/70 mt-1">
                Policies are loaded from the seed data.
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", p.autoResolve ? "bg-success" : "bg-warning")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium">{p.code} · {p.title}</div>
                    <div className="text-[10.5px] text-muted-foreground line-clamp-2">{p.description}</div>
                  </div>
                  <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">
                    {p.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Defaults info */}
      <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <div className="text-[12px] font-medium mb-0.5">Default configuration</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Defaults: auto-refund ≤ ${DEFAULT_SETTINGS.autoRefundLimit}, auto-resolve ≤ ${DEFAULT_SETTINGS.autoResolveUnder},
              high-value threshold ${DEFAULT_SETTINGS.highValueThreshold}, manager approval &gt; ${DEFAULT_SETTINGS.requireApprovalAbove},
              tone: {DEFAULT_SETTINGS.responseTone.replace(/_/g, " ")}. Settings persist for the server session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-[12px] font-medium">{label}</div>
        <div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}
