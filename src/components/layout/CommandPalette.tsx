"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/appStore";
import {
  Search,
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  ScrollText,
  Settings,
  MessageSquarePlus,
  ArrowRight,
  User,
  Package,
} from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { intentLabel, formatRelativeTime } from "@/lib/utils/format";
import type { ViewKey } from "@/store/appStore";

interface SearchResult {
  id: string;
  type: "case" | "customer" | "order" | "navigation";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const cases = useAppStore((s) => s.cases);
  const customers = useAppStore((s) => s.customers);
  const orders = useAppStore((s) => s.orders);
  const setView = useAppStore((s) => s.setView);
  const openCase = useAppStore((s) => s.openCase);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [opened, setOpened] = useState(false);

  // Track open state transitions to reset query/focus on open
  if (open && !opened) {
    setOpened(true);
    setQuery("");
    setSelectedIndex(0);
  }
  if (!open && opened) {
    setOpened(false);
  }

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show navigation items only
      const navItems: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { key: "dashboard", label: "Overview", icon: LayoutDashboard },
        { key: "inbox", label: "Case Inbox", icon: Inbox },
        { key: "escalations", label: "Escalation Queue", icon: AlertTriangle },
        { key: "intake", label: "New Intake", icon: MessageSquarePlus },
        { key: "audit", label: "Audit Log", icon: ScrollText },
        { key: "settings", label: "Settings", icon: Settings },
      ];
      return navItems.map((n) => ({
        id: `nav_${n.key}`,
        type: "navigation" as const,
        title: n.label,
        subtitle: "Go to page",
        icon: n.icon,
        action: () => {
          setView(n.key);
          setOpen(false);
        },
      }));
    }

    const matches: SearchResult[] = [];

    // Search cases
    const caseMatches = cases
      .filter((c) => {
        const customer = customers.find((cu) => cu.id === c.customerId);
        return (
          c.caseNumber.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q) ||
          (c.intent && intentLabel(c.intent).toLowerCase().includes(q)) ||
          customer?.name.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
    for (const c of caseMatches) {
      const customer = customers.find((cu) => cu.id === c.customerId);
      matches.push({
        id: `case_${c.id}`,
        type: "case",
        title: `${c.caseNumber} · ${c.subject}`,
        subtitle: `${customer?.name ?? "Unknown"} · ${formatRelativeTime(c.createdAt)}`,
        icon: Inbox,
        action: () => {
          openCase(c.id);
          setOpen(false);
        },
      });
    }

    // Search customers
    const customerMatches = customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
      .slice(0, 3);
    for (const c of customerMatches) {
      const customerCases = cases.filter((ca) => ca.customerId === c.id);
      matches.push({
        id: `customer_${c.id}`,
        type: "customer",
        title: c.name,
        subtitle: `${c.email} · ${c.tier} tier · ${customerCases.length} case(s)`,
        icon: User,
        action: () => {
          // Open the most recent case for this customer, or go to inbox filtered
          if (customerCases.length > 0) {
            openCase(customerCases[0].id);
            setOpen(false);
          } else {
            setSearchQuery(c.name);
            setView("inbox");
            setOpen(false);
          }
        },
      });
    }

    // Search orders
    const orderMatches = orders
      .filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q))
      )
      .slice(0, 3);
    for (const o of orderMatches) {
      const customer = customers.find((c) => c.id === o.customerId);
      matches.push({
        id: `order_${o.id}`,
        type: "order",
        title: o.orderNumber,
        subtitle: `${customer?.name ?? "Unknown"} · ${o.items.map((i) => i.name).join(", ")}`,
        icon: Package,
        action: () => {
          // Find a case linked to this order
          const linkedCase = cases.find((c) => c.orderId === o.id);
          if (linkedCase) {
            openCase(linkedCase.id);
          } else {
            setSearchQuery(o.orderNumber);
            setView("inbox");
          }
          setOpen(false);
        },
      });
    }

    return matches.slice(0, 12);
  }, [query, cases, customers, orders, setView, openCase, setOpen, setSearchQuery]);

  // Clamp selection to valid range (avoids setState-in-effect)
  const clampedIndex = Math.min(selectedIndex, Math.max(results.length - 1, 0));

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[clampedIndex]?.action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-[560px] top-[20vh] translate-y-0 overflow-hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cases, customers, orders, or navigate…"
            className="flex-1 h-11 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded border border-border">
            ESC
          </kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-[12px] text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            </div>
          ) : (
            <>
              {!query && (
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Navigate
                </div>
              )}
              {results.map((r, i) => {
                const Icon = r.icon;
                const active = i === clampedIndex;
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={r.action}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                      active ? "bg-muted/60" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{r.title}</div>
                      <div className="text-[10.5px] text-muted-foreground truncate">{r.subtitle}</div>
                    </div>
                    {active && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div className="border-t border-border px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded border border-border font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded border border-border font-mono">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded border border-border font-mono">↵</kbd>
              select
            </span>
          </div>
          <span>Tentacle</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
