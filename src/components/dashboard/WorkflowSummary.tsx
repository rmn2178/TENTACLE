"use client";

import { motion } from "framer-motion";

interface Stage {
  stage: string;
  count: number;
}

export function WorkflowSummary({ data }: { data: Stage[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[11.5px] text-muted-foreground">
        No pipeline data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const dropoff = i > 0 ? d.count - data[i - 1].count : 0;
        return (
          <div key={d.stage} className="flex items-center gap-3">
            <div className="w-[88px] shrink-0 text-[12px] text-muted-foreground text-right">
              {d.stage}
            </div>
            <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-foreground/80 rounded-md"
              />
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <span className="text-[11px] font-medium text-background mix-blend-difference">
                  {d.count}
                </span>
                {dropoff < 0 && (
                  <span className="text-[10px] text-destructive tnum">−{Math.abs(dropoff)}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
