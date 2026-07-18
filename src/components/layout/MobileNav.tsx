"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore, type ViewKey } from "@/store/appStore";
import {
  LayoutDashboard,
  TrendingUp,
  Inbox,
  Brain,
  Settings,
  Sparkles,
  AlertTriangle,
  ScrollText,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: () => number | null;
  separator?: boolean;
}

export function MobileNav() {
  const open = useAppStore((s) => s.mobileNavOpen);
  const setOpen = useAppStore((s) => s.setMobileNavOpen);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2.5 text-[14px]">
            <div className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="leading-tight">
              <div>Tentacle</div>
              <div className="text-[9.5px] font-normal text-muted-foreground">
                AI Workforce for SMBs
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = view === item.key;
            const Icon = item.icon;
            const badge = item.badge?.();
            return (
              <div key={item.key}>
                {item.separator && (
                  <div className="mx-2 my-2 border-t border-border" />
                )}
                <button
                  onClick={() => setView(item.key)}
                  className={cn(
                    "relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    active && "text-foreground bg-muted/60 font-medium"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-sidebar-active"
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

        {/* AI status */}
        <div className="px-3 pb-4 shrink-0">
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
            <p className="text-[10px] text-muted-foreground mt-1">
              Gemini 2.0 · Autonomous operations
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
