"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Brain,
  Settings,
  AlertTriangle,
  ScrollText,
} from "lucide-react";
import Image from "next/image";
import { useAppStore, type ViewKey } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: () => number | null;
  separator?: boolean;
}

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const cases = useAppStore((s) => s.cases);
  const aiAgents = useAppStore((s) => s.aiAgents);

  const openCaseCount = cases.filter(
    (c) => !["resolved", "escalated"].includes(c.status)
  ).length;
  const escalationCount = cases.filter((c) => c.status === "escalated").length;
  const activeLeads = useAppStore((s) =>
    s.leads.filter((l) => !["won", "lost"].includes(l.status)).length
  );
  const activeAgentCount = aiAgents.filter((a) =>
    ["active", "processing", "thinking"].includes(a.status)
  ).length;

  // Nav items — all sections visible
  const nav: NavItem[] = [
    { key: "dashboard",   label: "Overview",        icon: LayoutDashboard },
    {
      key: "revenue",
      label: "Revenue Agent",
      icon: TrendingUp,
      badge: () => (activeLeads > 0 ? activeLeads : null),
      separator: true,
    },
    {
      key: "inbox",
      label: "Case Inbox",
      icon: Inbox,
      badge: () => (openCaseCount > 0 ? openCaseCount : null),
    },
    {
      key: "escalations",
      label: "Escalations",
      icon: AlertTriangle,
      badge: () => (escalationCount > 0 ? escalationCount : null),
    },
    { key: "ledger",   label: "Decision Ledger", icon: Brain },
    { key: "audit",    label: "Audit Log",        icon: ScrollText, separator: true },
    { key: "settings", label: "Settings",         icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border bg-sidebar/60 backdrop-blur-sm">
      {/* Logo + tagline */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
          <Image src="/images/logo.png" alt="Tentacle" width={28} height={28} className="rounded-md object-contain" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-semibold tracking-tight">Tentacle</div>
          <div className="text-[9.5px] text-muted-foreground truncate">
            AI Workforce for SMBs
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          const badge = item.badge?.();
          return (
            <div key={item.key}>
              {item.separator && <div className="mx-2 my-2 border-t border-border" />}
              <button
                onClick={() => setView(item.key)}
                className={cn(
                  "relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-150",
                  "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  active && "text-foreground bg-sidebar-accent font-medium"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge != null && (
                  <span className="text-[10px] tnum px-1.5 py-0.5 rounded-full bg-foreground/8 text-foreground/70 font-medium">
                    {badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* AI status pill */}
      <div className="px-3 pb-4">
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-medium">AI Workforce</span>
            </div>
            <span className="text-[10px] tnum text-success font-medium">
              {activeAgentCount} active
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
            Gemini 2.0 · Autonomous operations running
          </p>
        </div>
      </div>
    </aside>
  );
}
