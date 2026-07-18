"use client";

import { useAppStore } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, Cpu, User, Server } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format";

const actorIcon = {
  system: Server,
  ai: Cpu,
  agent: User,
};

const categoryColor: Record<string, string> = {
  intake: "text-muted-foreground",
  classification: "text-info",
  retrieval: "text-violet-500",
  planning: "text-warning",
  action: "text-success",
  escalation: "text-destructive",
  state: "text-foreground",
};

export function AuditTrail({ caseId }: { caseId: string }) {
  const allAudit = useAppStore((s) => s.audit);
  const audit = useMemo(
    () => allAudit.filter((a) => a.caseId === caseId).slice(0, 30),
    [allAudit, caseId]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold">Audit Trail</span>
        <span className="ml-auto text-[10.5px] text-muted-foreground tnum">{audit.length} events</span>
      </div>

      {audit.length === 0 ? (
        <div className="p-4 text-[11.5px] text-muted-foreground/70">
          No audit events yet. Run the AI pipeline to generate traceable events.
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto p-3">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[10px] top-1 bottom-1 w-px bg-border" />
            <AnimatePresence initial={false}>
              {audit.map((entry, i) => {
                const Icon = actorIcon[entry.actor] ?? Server;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="relative pl-7 pb-3 last:pb-0"
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0.5 w-[21px] h-[21px] rounded-full border-2 border-background bg-card flex items-center justify-center",
                        categoryColor[entry.category] ?? "text-muted-foreground"
                      )}
                    >
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                        {entry.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-foreground/90 leading-relaxed">
                      {entry.detail}
                    </div>
                    {entry.actor === "ai" && (
                      <div className="text-[10px] text-info mt-0.5 font-mono">
                        {entry.action}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
