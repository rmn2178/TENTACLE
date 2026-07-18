"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { CaseInboxView } from "@/components/cases/CaseInboxView";
import { CaseDetailView } from "@/components/cases/CaseDetailView";
import { EscalationQueueView } from "@/components/cases/EscalationQueueView";
import { DecisionLedgerView } from "@/components/cases/DecisionLedgerView";
import { AuditLogView } from "@/components/cases/AuditLogView";
import { SettingsView } from "@/components/cases/SettingsView";
import { IntakeView } from "@/components/intake/IntakeView";
import { RevenueAgentView } from "@/components/revenue/RevenueAgentView";

interface HydrationData {
  cases: ReturnType<typeof Array.prototype.slice>;
  customers: unknown[];
  orders: unknown[];
  policies: unknown[];
  audit: unknown[];
  metrics: unknown;
}

export function Shell() {
  const view = useAppStore((s) => s.view);
  const selectedCaseId = useAppStore((s) => s.selectedCaseId);
  const hydrated = useAppStore((s) => s.hydrated);
  const setData = useAppStore((s) => s.setData);
  const setSettings = useAppStore((s) => s.setSettings);

  // Use React Query for data fetching — survives page refreshes and handles
  // serverless cold starts gracefully with proper loading/error states.
  const { data, isLoading, isError } = useQuery<HydrationData>({
    queryKey: ["app-data"],
    queryFn: async () => {
      const res = await fetch("/api/ingest", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch app data");
      return res.json();
    },
    staleTime: 10 * 1000, // 10 seconds
  });

  // Hydrate settings separately (changes infrequently)
  const { data: settingsData } = useQuery<{ settings: unknown }>({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (data) {
      setData({
        cases: data.cases as never[],
        customers: data.customers as never[],
        orders: data.orders as never[],
        policies: data.policies as never[],
        audit: data.audit as never[],
        metrics: data.metrics as never,
        learningEntries: (data as { learningEntries?: never[] }).learningEntries,
      });
    }
  }, [data, setData]);

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings as never);
    }
  }, [settingsData, setSettings]);

  if (isLoading && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-lg bg-foreground/10 animate-pulse" />
            <div className="absolute inset-0 rounded-lg border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
          <div className="text-[12px] text-muted-foreground">Initializing copilot…</div>
        </div>
      </div>
    );
  }

  if (isError && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-6 text-center">
          <div className="text-[14px] font-semibold text-destructive mb-1">Connection failed</div>
          <p className="text-[12px] text-muted-foreground mb-4">
            Could not load data from the server. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-foreground text-background"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={view + (view === "case" ? selectedCaseId ?? "" : "")}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="h-full overflow-auto"
              >
                <ErrorBoundary>
                  {view === "dashboard" && <DashboardView />}
                  {view === "inbox" && <CaseInboxView />}
                  {view === "case" && selectedCaseId && <CaseDetailView caseId={selectedCaseId} />}
                  {view === "escalations" && <EscalationQueueView />}
                  {view === "ledger" && <DecisionLedgerView />}
                  {view === "audit" && <AuditLogView />}
                  {view === "settings" && <SettingsView />}
                  {view === "intake" && <IntakeView />}
                  {view === "revenue" && <RevenueAgentView />}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <MobileNav />
        <CommandPalette />
      </div>
    </ErrorBoundary>
  );
}
