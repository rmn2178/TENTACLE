"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Sparkles, Loader2, Check, X, Edit3,
  MessageCircle, Mail, Globe, Instagram, MessageSquare,
  ShoppingBag, RotateCcw, ShoppingCart,
  Zap, Package, Tag, BookOpen, GraduationCap,
  CheckCircle2, Circle, ArrowRight, Users,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format";
import {
  mockCustomerSources, mockCommerceCustomers, mockCommerceAgents,
  mockActivityItems, COMMERCE_PIPELINE,
} from "@/lib/data/revenueData";
import type {
  CommerceCustomer, CustomerSource, CommerceChannel, CustomerQueueStatus,
  CommerceAgent, ActivityItem, LoyaltyTier,
} from "@/types/commerce";

// ── Channel config ─────────────────────────────────────────────────────────────

const channelIcon: Record<CommerceChannel, React.ComponentType<{ className?: string }>> = {
  instagram:    Instagram,
  whatsapp:     MessageCircle,
  website_chat: Globe,
  messenger:    MessageSquare,
  email:        Mail,
  returning:    RotateCcw,
  abandoned:    ShoppingCart,
};

const channelColor: Record<CommerceChannel, string> = {
  instagram:    "text-pink-500",
  whatsapp:     "text-emerald-600",
  website_chat: "text-info",
  messenger:    "text-blue-500",
  email:        "text-foreground",
  returning:    "text-violet-500",
  abandoned:    "text-warning",
};

const channelBg: Record<CommerceChannel, string> = {
  instagram:    "bg-pink-500/10",
  whatsapp:     "bg-emerald-500/10",
  website_chat: "bg-info/10",
  messenger:    "bg-blue-500/10",
  email:        "bg-muted/60",
  returning:    "bg-violet-500/10",
  abandoned:    "bg-warning/10",
};

// ── Status config ──────────────────────────────────────────────────────────────

const statusConfig: Record<CustomerQueueStatus, { label: string; color: string; bg: string; dot: string }> = {
  talking:              { label: "Talking",             color: "text-success",          bg: "bg-success/10",          dot: "bg-success animate-pulse"    },
  thinking:             { label: "Thinking",            color: "text-warning",          bg: "bg-warning/10",          dot: "bg-warning animate-pulse"    },
  recommendation_sent:  { label: "Recommendation Sent", color: "text-info",             bg: "bg-info/10",             dot: "bg-info"                     },
  checkout_pending:     { label: "Checkout Pending",    color: "text-violet-500",       bg: "bg-violet-500/10",       dot: "bg-violet-500 animate-pulse" },
  resolved:             { label: "Resolved",            color: "text-muted-foreground", bg: "bg-muted",               dot: "bg-muted-foreground"         },
  idle:                 { label: "Idle",                color: "text-muted-foreground", bg: "bg-muted",               dot: "bg-muted-foreground"         },
};

// ── Loyalty tier ───────────────────────────────────────────────────────────────

const tierConfig: Record<LoyaltyTier, { label: string; color: string; bg: string }> = {
  standard: { label: "Standard", color: "text-muted-foreground", bg: "bg-muted" },
  silver:   { label: "Silver",   color: "text-slate-600",        bg: "bg-slate-100"  },
  gold:     { label: "Gold",     color: "text-amber-600",        bg: "bg-amber-100"  },
  platinum: { label: "Platinum", color: "text-violet-600",       bg: "bg-violet-100" },
};

// ── Animated counter ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    ref.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (ref.current === null) ref.current = ts;
      const t = Math.min(1, (ts - ref.current) / 900);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(value * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="tnum">
      {prefix}{display.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// ── Source card ────────────────────────────────────────────────────────────────

function SourceCard({ source, active, onClick }: { source: CustomerSource; active: boolean; onClick: () => void }) {
  const Icon = channelIcon[source.channel];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left",
        active ? "border-foreground/20 bg-sidebar-accent" : "border-transparent hover:bg-muted/40"
      )}
    >
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", channelBg[source.channel])}>
        <Icon className={cn("w-3.5 h-3.5", channelColor[source.channel])} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-medium truncate">{source.label}</span>
          {source.unread > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-foreground text-background shrink-0">
              {source.unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10.5px] text-muted-foreground tnum">{source.count} customers</span>
          <span className="text-muted-foreground/40">·</span>
          <span className={cn("text-[10px] font-medium tnum", source.conversionPct >= 20 ? "text-success" : "text-muted-foreground")}>
            {source.conversionPct}% conv
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Customer queue row ─────────────────────────────────────────────────────────

function CustomerRow({ customer, selected, onClick }: { customer: CommerceCustomer; selected: boolean; onClick: () => void }) {
  const sc = statusConfig[customer.status];
  const ChIcon = channelIcon[customer.channel];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-left",
        selected ? "bg-sidebar-accent" : "hover:bg-muted/40"
      )}
    >
      {/* Avatar + status dot */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
          style={{ backgroundColor: `hsl(${customer.avatarHue}, 55%, 52%)` }}>
          {customer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card", sc.dot)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-medium truncate">{customer.name}</span>
          <ChIcon className={cn("w-3 h-3 shrink-0", channelColor[customer.channel])} />
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{customer.intent}</p>
      </div>

      <div className="shrink-0 text-right space-y-0.5">
        <div className="flex items-center justify-end gap-1">
          <span className="text-[10px] tnum text-muted-foreground">{customer.leadScore}</span>
          <div className="w-8 h-1 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", customer.leadScore > 80 ? "bg-success" : customer.leadScore > 60 ? "bg-warning" : "bg-muted-foreground/50")}
              style={{ width: `${customer.leadScore}%` }} />
          </div>
        </div>
        {customer.orderValueCents > 0 ? (
          <div className="text-[10.5px] font-semibold tnum text-success">
            ₹{(customer.orderValueCents / 100).toLocaleString("en-IN")}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground/60">—</div>
        )}
        <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded", sc.bg, sc.color)}>{sc.label}</span>
      </div>
    </button>
  );
}

// ── Customer profile card ──────────────────────────────────────────────────────

function CustomerProfile({ customer }: { customer: CommerceCustomer }) {
  const ChIcon = channelIcon[customer.channel];
  const tier = tierConfig[customer.loyaltyTier];
  const sc = statusConfig[customer.status];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
            style={{ backgroundColor: `hsl(${customer.avatarHue}, 55%, 52%)` }}>
            {customer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold">{customer.name}</span>
              <span className={cn("text-[9.5px] font-medium px-1.5 py-0.5 rounded-full", tier.bg, tier.color)}>{tier.label}</span>
              <span className={cn("text-[9.5px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1", sc.bg, sc.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] text-muted-foreground">
              <ChIcon className={cn("w-3 h-3", channelColor[customer.channel])} />
              <span>{customer.channel.replace("_", " ")}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>Last seen {formatRelativeTime(customer.lastSeen)}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead Score</div>
            <div className={cn("text-[22px] font-bold tnum", customer.leadScore > 80 ? "text-success" : customer.leadScore > 60 ? "text-warning" : "text-foreground")}>
              {customer.leadScore}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border">
        {[
          { label: "Previous Orders", value: customer.previousOrders > 0 ? `${customer.previousOrders} orders` : "First visit" },
          { label: "Lifetime Value",  value: customer.lifetimeValueCents > 0 ? `₹${(customer.lifetimeValueCents / 100).toLocaleString("en-IN")}` : "New customer" },
          { label: "Fav Categories",  value: customer.favoriteCategories.length > 0 ? customer.favoriteCategories[0] : "—" },
          { label: "Recent Purchase", value: customer.recentPurchase ?? "None" },
          { label: "Abandoned Cart",  value: customer.abandonedCart ?? "None" },
          { label: "Preferred Pay",   value: customer.preferredPayment ?? "Unknown" },
        ].map(f => (
          <div key={f.label} className="px-3 py-2.5">
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mb-0.5">{f.label}</div>
            <div className="text-[12px] font-medium truncate">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Commerce Recommendation card ───────────────────────────────────────────

function AICommerceRecommendation({ customer }: { customer: CommerceCustomer }) {
  const rec = customer.aiRecommendation;
  const [actioned, setActioned] = useState<"approved" | "rejected" | null>(null);

  if (actioned) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className={cn("rounded-xl border p-5 text-center", actioned === "approved" ? "border-success/30 bg-success/[0.04]" : "border-border bg-muted/20")}>
        {actioned === "approved" ? (
          <><Check className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-success">Approved — AI is sending checkout link</p>
          <p className="text-[12px] text-muted-foreground mt-1">Expected sale: ₹{(rec.expectedSaleCents / 100).toLocaleString("en-IN")}</p></>
        ) : (
          <><X className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] font-semibold">Recommendation rejected</p>
          <p className="text-[12px] text-muted-foreground mt-1">Feedback recorded. Learning engine updated.</p></>
        )}
        <button onClick={() => setActioned(null)} className="mt-3 text-[11px] text-muted-foreground hover:text-foreground underline">Reset</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-0">
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex-1">AI Recommendation</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
          {rec.confidence}% confidence
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-2 pb-3">
        <h2 className="text-[19px] font-semibold tracking-tight">{rec.title}</h2>
        <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{rec.reason}</p>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-b border-border">
        <div className="px-4 py-3">
          <div className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Expected Sale</div>
          <div className="text-[18px] font-bold tnum text-success">₹{(rec.expectedSaleCents / 100).toLocaleString("en-IN")}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Products</div>
          <div className="text-[12px] font-medium">{rec.products.length} items</div>
          <p className="text-[10.5px] text-muted-foreground truncate">{rec.products[0]}</p>
        </div>
        <div className="px-4 py-3">
          <div className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Lead Score</div>
          <div className="text-[18px] font-bold tnum">{customer.leadScore}</div>
          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${customer.leadScore}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className={cn("h-full rounded-full", customer.leadScore > 80 ? "bg-success" : "bg-warning")} />
          </div>
        </div>
      </div>

      {/* Product tags */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap gap-1.5">
        {rec.products.map(p => (
          <span key={p} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted/60 border border-border">
            <Package className="w-2.5 h-2.5 text-muted-foreground" />{p}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setActioned("approved")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors">
          <Check className="w-3.5 h-3.5" /> Approve
        </button>
        <button className="h-9 px-4 rounded-lg text-[13px] border border-border hover:bg-muted/40 transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setActioned("rejected")}
          className="h-9 px-4 rounded-lg text-[13px] border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Buying signals ─────────────────────────────────────────────────────────────

function BuyingSignals({ customer }: { customer: CommerceCustomer }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Buying Signals</div>
      <div className="space-y-2.5">
        {customer.buyingSignals.map((sig, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium">{sig.label}</span>
              <span className="text-[10.5px] tnum text-muted-foreground">{Math.round(sig.weight * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${sig.weight * 100}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                className={cn("h-full rounded-full", sig.weight > 0.85 ? "bg-success" : sig.weight > 0.65 ? "bg-info" : "bg-warning")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer journey ───────────────────────────────────────────────────────────

function CustomerJourney({ customer }: { customer: CommerceCustomer }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Customer Journey</div>
      <div className="space-y-0">
        {customer.journeyStages.map((stage, i) => (
          <div key={stage.key} className="flex items-start gap-2.5">
            {/* Connector */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border",
                stage.done ? "bg-success border-success" : stage.active ? "bg-foreground border-foreground" : "bg-background border-border")}>
                {stage.done ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                  : stage.active ? <Loader2 className="w-2.5 h-2.5 text-background animate-spin" />
                  : <Circle className="w-2 h-2 text-muted-foreground/30" />}
              </div>
              {i < customer.journeyStages.length - 1 && (
                <div className={cn("w-px flex-1 min-h-[14px]", stage.done ? "bg-success/40" : "bg-border")} />
              )}
            </div>
            <div className={cn("pb-2 pt-0.5", i === customer.journeyStages.length - 1 ? "pb-0" : "")}>
              <span className={cn("text-[12px] font-medium",
                stage.done ? "text-foreground" : stage.active ? "text-foreground" : "text-muted-foreground/60")}>
                {stage.label}
              </span>
              {stage.active && <span className="ml-1.5 text-[10px] text-muted-foreground italic">in progress…</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Commerce AI agents panel ───────────────────────────────────────────────────

const agentIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  ca_sales: TrendingUp, ca_reco: Sparkles, ca_inventory: Package,
  ca_pricing: Tag, ca_order: ShoppingBag, ca_learning: GraduationCap,
};

const agentStatusDot: Record<string, string> = {
  active: "bg-success animate-pulse", processing: "bg-info animate-pulse",
  thinking: "bg-warning animate-pulse", idle: "bg-muted-foreground",
};

function CommerceAgentsPanel({ agents }: { agents: CommerceAgent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold flex-1">AI Workforce</span>
        <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {agents.filter(a => a.status !== "idle").length} active
        </span>
      </div>
      <div className="divide-y divide-border">
        {agents.map(agent => {
          const Icon = agentIcon[agent.id] ?? Zap;
          return (
            <div key={agent.id} className="flex items-center gap-2.5 px-3 py-2">
              <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center">
                  {agent.status !== "idle" ? <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" /> : <Icon className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card", agentStatusDot[agent.status] ?? "bg-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-medium">{agent.name}</span>
                  <span className="text-[10px] tnum text-muted-foreground">{agent.confidence}%</span>
                </div>
                {agent.task
                  ? <p className="text-[10.5px] text-muted-foreground truncate">{agent.task}</p>
                  : <p className="text-[10.5px] text-muted-foreground/40 italic">Awaiting task</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live activity feed ─────────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold flex-1">Live AI Activity</span>
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      </div>
      <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-2.5 px-3 py-2">
            <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] leading-snug">{item.text}</p>
              <span className="text-[10px] text-muted-foreground">{formatRelativeTime(item.timeAgo)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Commerce Pipeline strip ────────────────────────────────────────────────────

function CommercePipelineStrip({ activeStageKey }: { activeStageKey: string }) {
  return (
    <div className="border-t border-border bg-card/60 px-4 py-3 shrink-0">
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {COMMERCE_PIPELINE.map((stage, i) => {
          const isActive = stage.key === activeStageKey;
          const isDone = COMMERCE_PIPELINE.findIndex(s => s.key === activeStageKey) > i;
          return (
            <div key={stage.key} className="flex items-center shrink-0">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                isActive && "bg-foreground text-background",
                isDone && !isActive && "text-success",
                !isActive && !isDone && "text-muted-foreground/50"
              )}>
                {isDone && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                {isActive && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                {stage.label}
              </div>
              {i < COMMERCE_PIPELINE.length - 1 && (
                <ArrowRight className={cn("w-3 h-3 mx-0.5 shrink-0", isDone ? "text-success/60" : "text-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function RevenueAgentView() {
  const revenueMetrics = useAppStore((s) => s.revenueMetrics);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(mockCommerceCustomers[0]?.id ?? "");
  const [agentRunning, setAgentRunning] = useState(false);

  const customers = useMemo(() => {
    if (!selectedSource) return mockCommerceCustomers;
    const src = mockCustomerSources.find(s => s.id === selectedSource);
    if (!src) return mockCommerceCustomers;
    return mockCommerceCustomers.filter(c => c.channel === src.channel);
  }, [selectedSource]);

  const activeCustomer = useMemo(
    () => mockCommerceCustomers.find(c => c.id === selectedCustomerId) ?? mockCommerceCustomers[0],
    [selectedCustomerId]
  );

  const activePipelineStage = useMemo(() => {
    const active = activeCustomer?.journeyStages.find(s => s.active);
    if (active) return active.key;
    const lastDone = [...(activeCustomer?.journeyStages ?? [])].reverse().find(s => s.done);
    return lastDone?.key ?? "arrive";
  }, [activeCustomer]);

  async function runAgent() {
    setAgentRunning(true);
    await new Promise(r => setTimeout(r, 2200));
    setAgentRunning(false);
  }

  const totalOnline = mockCustomerSources.reduce((n, s) => n + s.count, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Top header ── */}
      <div className="shrink-0 border-b border-border bg-card/40 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                Revenue Agent
                <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Autonomous
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground">AI converting conversations into sales across {mockCustomerSources.length} channels</p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="flex items-center gap-0 divide-x divide-border border border-border rounded-lg overflow-hidden bg-background">
            {[
              { label: "Today's Sales",   value: revenueMetrics.todaysRevenueCents / 100,  prefix: "₹", isSuccess: true },
              { label: "AI Sales",        value: revenueMetrics.revenueProtectedCents / 100, prefix: "₹", isSuccess: true },
              { label: "Conversion",      value: revenueMetrics.conversionRate * 100, suffix: "%", decimals: 1 },
              { label: "Online Now",      value: totalOnline, suffix: "" },
            ].map(k => (
              <div key={k.label} className="px-3 py-1.5 text-center min-w-[80px]">
                <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className={cn("text-[14px] font-bold tnum", k.isSuccess ? "text-success" : "text-foreground")}>
                  <AnimatedNumber value={k.value} prefix={k.prefix ?? ""} suffix={k.suffix ?? ""} decimals={k.decimals} />
                </div>
              </div>
            ))}
          </div>

          {/* Run agent button */}
          <button onClick={runAgent} disabled={agentRunning}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors shrink-0">
            {agentRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Run Agent
          </button>
        </div>
      </div>

      {/* ── 4-column body ── */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* COL 1 — Customer Sources */}
        <div className="w-[200px] shrink-0 border-r border-border flex flex-col bg-sidebar/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customer Sources</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            <button
              onClick={() => setSelectedSource(null)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors",
                !selectedSource ? "bg-sidebar-accent" : "hover:bg-muted/40"
              )}
            >
              <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-medium">All Sources</div>
                <div className="text-[10px] text-muted-foreground">{totalOnline} customers</div>
              </div>
            </button>
            {mockCustomerSources.map(src => (
              <SourceCard
                key={src.id}
                source={src}
                active={selectedSource === src.id}
                onClick={() => setSelectedSource(selectedSource === src.id ? null : src.id)}
              />
            ))}
          </div>
        </div>

        {/* COL 2 — Customer Queue */}
        <div className="w-[232px] shrink-0 border-r border-border flex flex-col bg-sidebar/20 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live Queue</span>
            <span className="text-[10px] tnum text-muted-foreground">{customers.length}</span>
          </div>
          {/* Column headers */}
          <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/20 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">Customer · Intent</span>
            <span className="w-14 text-right">Score · Value</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {customers.map(c => (
              <CustomerRow
                key={c.id}
                customer={c}
                selected={selectedCustomerId === c.id}
                onClick={() => setSelectedCustomerId(c.id)}
              />
            ))}
          </div>
        </div>

        {/* COL 3 — Customer Intelligence + Recommendation */}
        <div className="flex-1 overflow-y-auto min-w-0 bg-background">
          {activeCustomer ? (
            <div className="px-4 py-4 max-w-[700px] mx-auto space-y-3">
              <CustomerProfile customer={activeCustomer} />
              <AICommerceRecommendation customer={activeCustomer} />
              <BuyingSignals customer={activeCustomer} />
              <CustomerJourney customer={activeCustomer} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
              Select a customer to view details
            </div>
          )}
        </div>

        {/* COL 4 — AI Workforce + Activity */}
        <div className="w-[272px] shrink-0 border-l border-border flex flex-col bg-sidebar/20 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <CommerceAgentsPanel agents={mockCommerceAgents} />
            <ActivityFeed items={mockActivityItems} />
          </div>
        </div>
      </div>

      {/* ── Bottom Pipeline strip ── */}
      <CommercePipelineStrip activeStageKey={activePipelineStage} />
    </div>
  );
}
