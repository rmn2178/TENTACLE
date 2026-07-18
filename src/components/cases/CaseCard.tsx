"use client";

import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { statusColor, urgencyColor, sentimentColor, intentLabel, formatRelativeTime, channelLabel, initials } from "@/lib/utils/format";
import type { CaseRecord } from "@/types";
import { MessageSquare, Mail, Smartphone } from "lucide-react";

const channelIcon = {
  chat: MessageSquare,
  email: Mail,
  whatsapp: Smartphone,
};

export function CaseCard({
  caseRecord,
  selected,
  onClick,
}: {
  caseRecord: CaseRecord;
  selected?: boolean;
  onClick: () => void;
}) {
  const customer = useAppStore((s) => s.customers.find((c) => c.id === caseRecord.customerId));
  const status = statusColor(caseRecord.status);
  const ChannelIcon = channelIcon[caseRecord.channel];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left grid grid-cols-1 md:grid-cols-[120px_minmax(0,1fr)_120px_120px_120px_120px] gap-3 px-4 py-3 transition-colors duration-150",
        "hover:bg-muted/40",
        selected && "bg-muted/60"
      )}
    >
      {/* Case number + customer */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, hsl(${customer?.avatarHue ?? 220} 60% 55%), hsl(${(customer?.avatarHue ?? 220) + 30} 65% 45%))`,
          }}
        >
          {initials(customer?.name ?? "?")}
        </div>
        <div className="min-w-0 hidden md:block">
          <div className="text-[12px] font-medium truncate">{caseRecord.caseNumber}</div>
          <div className="text-[11px] text-muted-foreground truncate">{customer?.name}</div>
        </div>
      </div>

      {/* Subject + message preview */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <ChannelIcon className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[12.5px] font-medium truncate">{caseRecord.subject}</span>
        </div>
        <div className="text-[11.5px] text-muted-foreground truncate">
          {caseRecord.message.slice(0, 120)}
          {caseRecord.message.length > 120 ? "…" : ""}
        </div>
        <div className="md:hidden text-[10.5px] text-muted-foreground mt-1">
          {formatRelativeTime(caseRecord.createdAt)} · {channelLabel(caseRecord.channel)}
        </div>
      </div>

      {/* Intent */}
      <div className="hidden md:block">
        {caseRecord.intent ? (
          <span className="text-[11.5px] text-foreground/80">{intentLabel(caseRecord.intent)}</span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground/60 italic">unclassified</span>
        )}
        <div className="text-[10.5px] text-muted-foreground mt-0.5">{formatRelativeTime(caseRecord.createdAt)}</div>
      </div>

      {/* Sentiment */}
      <div className="hidden md:flex items-center">
        {caseRecord.sentiment ? (
          <span className={cn("text-[11.5px] font-medium", sentimentColor(caseRecord.sentiment).text)}>
            {sentimentColor(caseRecord.sentiment).label}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground/60 italic">—</span>
        )}
      </div>

      {/* Urgency */}
      <div className="hidden md:flex items-center">
        {caseRecord.urgency ? (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md", urgencyColor(caseRecord.urgency).bg, urgencyColor(caseRecord.urgency).text)}>
            {urgencyColor(caseRecord.urgency).label}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground/60 italic">—</span>
        )}
      </div>

      {/* Status */}
      <div className="hidden md:flex items-center">
        <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium px-1.5 py-0.5 rounded-md", status.bg, status.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>
    </button>
  );
}
