"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Headphones,
  TrendingUp,
  GraduationCap,
  Loader2,
  Search,
  BookOpen,
  ShieldAlert,
  DollarSign,
  Scale,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import type { AIAgent, AIAgentType, AIAgentStatus } from "@/types/revenue";

const agentIcon: Record<AIAgentType, React.ComponentType<{ className?: string }>> = {
  support:    Headphones,
  revenue:    TrendingUp,
  research:   Search,
  policy:     BookOpen,
  risk:       ShieldAlert,
  finance:    DollarSign,
  compliance: Scale,
  learning:   GraduationCap,
  execution:  Zap,
};

const statusConfig: Record<
  AIAgentStatus,
  { label: string; dot: string; text: string; pulse: boolean }
> = {
  active:     { label: "Active",      dot: "bg-success",          text: "text-success",          pulse: true  },
  processing: { label: "Processing",  dot: "bg-info",             text: "text-info",             pulse: true  },
  thinking:   { label: "Thinking",    dot: "bg-warning",          text: "text-warning",          pulse: true  },
  idle:       { label: "Idle",        dot: "bg-muted-foreground", text: "text-muted-foreground", pulse: false },
  paused:     { label: "Paused",      dot: "bg-muted-foreground", text: "text-muted-foreground", pulse: false },
};

// Primary agents always shown at top
const PRIMARY_AGENTS: AIAgentType[] = ["support", "revenue", "learning"];

function AgentRow({ agent }: { agent: AIAgent }) {
  const Icon = agentIcon[agent.type];
  const sc = statusConfig[agent.status];
  const isBusy =
    agent.status === "processing" || agent.status === "thinking";

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors">
      {/* Icon + dot */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center">
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : (
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-card",
            sc.dot,
            sc.pulse && "animate-pulse"
          )}
        />
      </div>

      {/* Name + task */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium">{agent.name}</span>
          <span className={cn("text-[9.5px] font-medium shrink-0", sc.text)}>
            {sc.label}
          </span>
        </div>
        {agent.currentTask ? (
          <p className="text-[11px] text-muted-foreground truncate">
            {agent.currentTask}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/45 italic">
            Awaiting task
          </p>
        )}
      </div>

      {/* Confidence only — cleaner on small screens */}
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "text-[11px] tnum font-medium",
            agent.confidence > 0.9
              ? "text-success"
              : agent.confidence > 0.75
              ? "text-foreground"
              : "text-warning"
          )}
        >
          {(agent.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export function AIWorkforceWidget() {
  const agents = useAppStore((s) => s.aiAgents);
  const [expanded, setExpanded] = useState(false);

  const primary = agents.filter((a) => PRIMARY_AGENTS.includes(a.type));
  const rest = agents.filter((a) => !PRIMARY_AGENTS.includes(a.type));

  const activeCount = agents.filter((a) =>
    ["active", "processing", "thinking"].includes(a.status)
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] font-semibold flex-1">AI Workforce</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {activeCount} active
        </span>
      </div>

      {/* Primary 3 agents — always visible */}
      <div className="px-1 pt-1.5 pb-0.5">
        {primary.map((a) => (
          <AgentRow key={a.id} agent={a} />
        ))}
      </div>

      {/* Expand / collapse remaining agents */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="extra"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-1"
          >
            {rest.map((a) => (
              <AgentRow key={a.id} agent={a} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-center gap-1.5 border-t border-border px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" /> Hide agents
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" /> View all {agents.length} agents
          </>
        )}
      </button>
    </div>
  );
}
