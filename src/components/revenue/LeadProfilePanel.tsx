"use client";

import { motion } from "framer-motion";
import {
  User,
  Building2,
  MapPin,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
  ShoppingCart,
  ShieldAlert,
  Shield,
  Users,
  MessageSquare,
  DollarSign,
  Briefcase,
  BadgeCheck,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";
import type { Lead, BuyingIntent, LeadRisk, CustomerSegment } from "@/types/revenue";

// ── Config maps ────────────────────────────────────────────────────────────────

const intentConfig: Record<BuyingIntent, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  cold:   { label: "Cold",   icon: Snowflake,   color: "text-muted-foreground", bg: "bg-muted" },
  warm:   { label: "Warm",   icon: Thermometer, color: "text-warning",          bg: "bg-warning/10" },
  hot:    { label: "Hot",    icon: Flame,        color: "text-orange-500",       bg: "bg-orange-500/10" },
  buying: { label: "Buying", icon: ShoppingCart, color: "text-success",          bg: "bg-success/10" },
};

const riskConfig: Record<LeadRisk, { label: string; color: string; bg: string }> = {
  low:    { label: "Low Risk",    color: "text-success",     bg: "bg-success/10" },
  medium: { label: "Medium Risk", color: "text-warning",     bg: "bg-warning/10" },
  high:   { label: "High Risk",   color: "text-destructive", bg: "bg-destructive/10" },
};

const segmentConfig: Record<CustomerSegment, { label: string }> = {
  smb:         { label: "SMB" },
  mid_market:  { label: "Mid-Market" },
  enterprise:  { label: "Enterprise" },
  strategic:   { label: "Strategic" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[11.5px] font-medium text-right", className)}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className={cn(
            "h-full rounded-full",
            value > 0.8 ? "bg-success" : value > 0.5 ? "bg-warning" : "bg-destructive",
            className
          )}
        />
      </div>
      <span className="text-[10px] tnum text-muted-foreground w-7 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ * score;
  const color = score > 0.75 ? "text-success" : score > 0.45 ? "text-warning" : "text-destructive";

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} strokeWidth="3" stroke="currentColor" className="text-muted/60" fill="none" />
        <motion.circle
          cx="24" cy="24" r={r} strokeWidth="3"
          stroke="currentColor"
          className={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center text-[13px] font-bold tnum", color)}>
        {Math.round(score * 100)}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  lead: Lead;
}

export function LeadProfilePanel({ lead }: Props) {
  const intent = intentConfig[lead.buyingIntent];
  const IntentIcon = intent.icon;
  const risk = riskConfig[lead.risk];
  const segment = segmentConfig[lead.customerSegment];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
            style={{ backgroundColor: `hsl(${(lead.name.charCodeAt(0) * 47) % 360}, 55%, 52%)` }}
          >
            {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold truncate">{lead.name}</span>
              <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {lead.leadNumber}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Building2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11.5px] text-muted-foreground">{lead.company}</span>
              <span className="text-muted-foreground/40">·</span>
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11.5px] text-muted-foreground">{lead.location}</span>
            </div>
          </div>
          <ScoreRing score={lead.leadScore} />
        </div>

        {/* Intent + Risk badges */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", intent.bg, intent.color)}>
            <IntentIcon className="w-2.5 h-2.5" />
            {intent.label} Intent
          </span>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", risk.bg, risk.color)}>
            {lead.risk === "low" ? <Shield className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
            {risk.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <LayoutGrid className="w-2.5 h-2.5" />
            {segment.label}
          </span>
        </div>
      </div>

      {/* Intelligence grid */}
      <div className="p-4 space-y-0">
        {/* Revenue stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Predicted Revenue</span>
            </div>
            <div className="text-[17px] font-semibold text-success tnum">
              {formatCurrency(lead.predictedRevenueCents)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-foreground" />
              <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Lifetime Value</span>
            </div>
            <div className="text-[17px] font-semibold tnum">
              {formatCurrency(lead.lifetimeValueCents)}
            </div>
          </div>
        </div>

        {/* Fields */}
        <Row label="Industry" value={<span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-muted-foreground" />{lead.industry}</span>} />
        <Row label="Company Size" value={<span className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" />{lead.companySize}</span>} />
        <Row
          label="Decision Maker Confidence"
          value={
            <div className="w-24">
              <ConfidenceBar value={lead.decisionMakerConfidence} />
            </div>
          }
        />
        <Row
          label="Open Opportunities"
          value={
            <span className={lead.openOpportunities > 0 ? "text-success" : "text-muted-foreground"}>
              {lead.openOpportunities}
            </span>
          }
        />
        <Row
          label="Previous Conversations"
          value={
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              {lead.intelligence?.previousConversations ?? 0}
            </span>
          }
        />
        {lead.lastPurchaseCents != null && (
          <Row
            label="Last Purchase"
            value={<span className="text-success">{formatCurrency(lead.lastPurchaseCents)}</span>}
          />
        )}
        <Row
          label="Last Updated"
          value={<span className="text-muted-foreground">{formatRelativeTime(lead.updatedAt)}</span>}
        />
      </div>

      {/* Intelligence signals */}
      {lead.intelligence?.signals && lead.intelligence.signals.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" /> Buying Signals
          </div>
          <div className="space-y-1.5">
            {lead.intelligence.signals.map((sig) => (
              <div key={sig.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium">{sig.label}</span>
                  <span className="text-[10px] tnum text-muted-foreground">{(sig.weight * 100).toFixed(0)}%</span>
                </div>
                <ConfidenceBar value={sig.weight} />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{sig.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
