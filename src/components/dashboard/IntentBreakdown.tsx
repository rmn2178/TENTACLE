"use client";

import { motion } from "framer-motion";

interface Data {
  intent: string;
  count: number;
}

const COLORS = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
  "var(--info)",
  "var(--success)",
];

export function IntentBreakdown({ data }: { data: Data[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[11.5px] text-muted-foreground">
        No intent data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 7).map((d, i) => (
        <motion.div
          key={d.intent}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-1 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
          <div className="flex-1 text-[12px] truncate">{d.intent}</div>
          <div className="text-[11px] text-muted-foreground tnum">{d.count}</div>
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.06 }}
              className="h-full rounded-full"
              style={{ backgroundColor: COLORS[i] }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
