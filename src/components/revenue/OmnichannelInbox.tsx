"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Mail,
  Globe,
  Instagram,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
  ShoppingCart,
  Circle,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { formatRelativeTime, tierColor } from "@/lib/utils/format";
import type { OmniChannel, BuyingIntent, ConversationAIStatus } from "@/types/revenue";
import { initials } from "@/lib/utils/format";

// ── Channel config ─────────────────────────────────────────────────────────────

const channelConfig: Record<OmniChannel, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  whatsapp:     { label: "WhatsApp",  icon: MessageCircle, color: "text-emerald-600" },
  instagram:    { label: "Instagram", icon: Instagram,     color: "text-pink-500"   },
  website_chat: { label: "Web Chat",  icon: Globe,         color: "text-info"       },
  email:        { label: "Email",     icon: Mail,          color: "text-foreground" },
  messenger:    { label: "Messenger", icon: MessageSquare, color: "text-blue-500"   },
};

// ── Buying intent config ───────────────────────────────────────────────────────

const intentConfig: Record<BuyingIntent, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  cold:   { label: "Cold",   icon: Snowflake,   color: "text-muted-foreground", bg: "bg-muted" },
  warm:   { label: "Warm",   icon: Thermometer, color: "text-warning",          bg: "bg-warning/10" },
  hot:    { label: "Hot",    icon: Flame,        color: "text-orange-500",       bg: "bg-orange-500/10" },
  buying: { label: "Buying", icon: ShoppingCart, color: "text-success",          bg: "bg-success/10" },
};

// ── AI status config ───────────────────────────────────────────────────────────

const aiStatusConfig: Record<ConversationAIStatus, { label: string; color: string; dot: string }> = {
  handled:  { label: "Handled",   color: "text-success",          dot: "bg-success" },
  active:   { label: "AI Active", color: "text-info",             dot: "bg-info" },
  escalated:{ label: "Escalated", color: "text-destructive",      dot: "bg-destructive" },
  idle:     { label: "Idle",      color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

type ChannelFilter = "all" | OmniChannel;

export function OmnichannelInbox() {
  const conversations = useAppStore((s) => s.conversations);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");

  const filtered = channelFilter === "all"
    ? conversations
    : conversations.filter((c) => c.channel === channelFilter);

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);
  const channels: ChannelFilter[] = ["all", "email", "whatsapp", "website_chat", "instagram", "messenger"];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold flex-1">Omnichannel Inbox</span>
        {totalUnread > 0 && (
          <span className="text-[10px] tnum px-1.5 py-0.5 rounded-full bg-foreground text-background font-medium">
            {totalUnread}
          </span>
        )}
      </div>

      {/* Channel filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
        {channels.map((ch) => {
          const isAll = ch === "all";
          const Icon = isAll ? null : channelConfig[ch as OmniChannel].icon;
          const count = isAll
            ? conversations.length
            : conversations.filter((c) => c.channel === ch).length;
          if (!isAll && count === 0) return null;
          return (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors",
                channelFilter === ch
                  ? "bg-foreground/8 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {Icon && <Icon className={cn("w-3 h-3", !isAll && channelConfig[ch as OmniChannel].color)} />}
              {isAll ? "All" : channelConfig[ch as OmniChannel].label}
              <span className="text-[9.5px] tnum text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Column headers */}
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_80px_70px] gap-2 px-3 py-1.5 text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/20">
        <div>Conversation</div>
        <div>Lead Score</div>
        <div>Intent</div>
        <div>AI Status</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-muted-foreground">
            No conversations in this channel
          </div>
        ) : (
          filtered.map((conv, i) => {
            const ch = channelConfig[conv.channel];
            const ChIcon = ch.icon;
            const intent = intentConfig[conv.buyingIntent];
            const IntentIcon = intent.icon;
            const aiStatus = aiStatusConfig[conv.aiStatus];
            const tc = tierColor(conv.customerTier as never);

            return (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_80px_80px_70px] gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
              >
                {/* Customer + preview */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-semibold"
                    style={{ backgroundColor: `hsl(${conv.avatarHue}, 55%, 52%)` }}
                  >
                    {initials(conv.customerName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-medium truncate">{conv.customerName}</span>
                      <ChIcon className={cn("w-3 h-3 shrink-0", ch.color)} aria-label={ch.label} />
                      <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded", tc.bg, tc.text)}>
                        {conv.customerTier}
                      </span>
                      {conv.unread > 0 && (
                        <span className="text-[9.5px] tnum px-1.5 py-0.5 rounded-full bg-foreground text-background font-medium">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{conv.preview}</p>
                  </div>
                </div>

                {/* Lead score bar */}
                <div className="hidden md:flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        conv.leadScore > 0.75 ? "bg-success" : conv.leadScore > 0.45 ? "bg-warning" : "bg-muted-foreground/40"
                      )}
                      style={{ width: `${conv.leadScore * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tnum text-muted-foreground shrink-0">
                    {(conv.leadScore * 100).toFixed(0)}
                  </span>
                </div>

                {/* Buying intent */}
                <div className="hidden md:flex items-center">
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded", intent.bg, intent.color)}>
                    <IntentIcon className="w-2.5 h-2.5" />
                    {intent.label}
                  </span>
                </div>

                {/* AI Status */}
                <div className="hidden md:flex items-center gap-1.5">
                  {conv.aiStatus === "active" ? (
                    <Sparkles className="w-3 h-3 text-info animate-pulse" />
                  ) : (
                    <div className={cn("w-1.5 h-1.5 rounded-full", aiStatus.dot)} />
                  )}
                  <span className={cn("text-[10px] font-medium", aiStatus.color)}>{aiStatus.label}</span>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>{filtered.length} conversation{filtered.length !== 1 ? "s" : ""}</span>
        <span className="inline-flex items-center gap-1">
          <Circle className="w-2 h-2 fill-success text-success animate-pulse" />
          AI monitoring all channels
        </span>
      </div>
    </div>
  );
}
