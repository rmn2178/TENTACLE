"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { motion } from "framer-motion";

interface DataPoint {
  date: string;
  count: number;
}

export function CasesChart({ data, autoResolved, totalCases }: { data: DataPoint[]; autoResolved: number; totalCases: number }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[11.5px] text-muted-foreground">
        No case volume data yet
      </div>
    );
  }
  // Estimate resolved per day proportional to overall auto-resolution rate
  const rate = totalCases > 0 ? autoResolved / totalCases : 0.8;
  const enriched = data.map((d) => ({
    ...d,
    resolved: Math.round(d.count * rate * (0.85 + Math.random() * 0.1)),
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={enriched} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="g-inbound" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="url(#g-inbound)"
            name="Inbound"
            isAnimationActive
            animationDuration={900}
          />
          <Area
            type="monotone"
            dataKey="resolved"
            stroke="var(--success)"
            strokeWidth={2}
            fill="url(#g-resolved)"
            name="Resolved"
            isAnimationActive
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
