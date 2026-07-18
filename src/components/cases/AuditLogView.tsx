"use client";

import { useAppStore } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, Cpu, User, Server, Filter } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function AuditLogView() {
  const audit = useAppStore((s) => s.audit);
  const openCase = useAppStore((s) => s.openCase);
  const [filter, setFilter] = useState("all");
  const [actor, setActor] = useState("all");

  const filtered = audit.filter((a) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (actor !== "all" && a.actor !== actor) return false;
    return true;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Audit Log</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filtered.length} events · full traceability across all cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-[150px] text-[12px] bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="intake">Intake</SelectItem>
              <SelectItem value="classification">Classification</SelectItem>
              <SelectItem value="retrieval">Retrieval</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="action">Action</SelectItem>
              <SelectItem value="escalation">Escalation</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger className="h-8 w-[120px] text-[12px] bg-background">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[140px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
          <div>When</div>
          <div>Event</div>
          <div>Case</div>
          <div>Actor</div>
        </div>
        <div className="divide-y divide-border max-h-[calc(100vh-260px)] overflow-y-auto">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Filter className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
                <div className="text-[12px] text-muted-foreground">No events match these filters</div>
              </div>
            ) : (
              filtered.map((entry, i) => {
                const Icon = actorIcon[entry.actor] ?? Server;
                return (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => entry.caseId && openCase(entry.caseId)}
                    className="w-full text-left grid grid-cols-[140px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="text-[11px] text-muted-foreground tnum">
                      {formatRelativeTime(entry.createdAt)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={cn(
                            "text-[9.5px] uppercase tracking-wider font-medium px-1 py-0.5 rounded",
                            "bg-muted/60",
                            categoryColor[entry.category] ?? "text-muted-foreground"
                          )}
                        >
                          {entry.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {entry.action}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-foreground/90 truncate">
                        {entry.detail}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {entry.caseNumber ?? "—"}
                      {entry.customerName && (
                        <div className="text-[10px] text-muted-foreground/70 truncate">
                          {entry.customerName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3 h-3", categoryColor[entry.category] ?? "text-muted-foreground")} />
                      <span className="text-[10.5px] text-muted-foreground capitalize">{entry.actor}</span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
