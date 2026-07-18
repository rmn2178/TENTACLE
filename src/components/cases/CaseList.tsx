"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { CaseCard } from "./CaseCard";
import type { CaseRecord } from "@/types";

export function CaseList({ cases }: { cases: CaseRecord[] }) {
  const openCase = useAppStore((s) => s.openCase);
  const selectedCaseId = useAppStore((s) => s.selectedCaseId);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="hidden md:grid grid-cols-[120px_minmax(0,1fr)_120px_120px_120px_120px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        <div>Case</div>
        <div>Subject</div>
        <div>Intent</div>
        <div>Sentiment</div>
        <div>Urgency</div>
        <div>Status</div>
      </div>
      <div className="divide-y divide-border">
        {cases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.2 }}
          >
            <CaseCard
              caseRecord={c}
              selected={selectedCaseId === c.id}
              onClick={() => openCase(c.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
