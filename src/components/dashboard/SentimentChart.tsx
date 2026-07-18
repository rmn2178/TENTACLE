"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis } from "recharts";

interface DataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[11.5px] text-muted-foreground">
        No sentiment data yet
      </div>
    );
  }
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="positive" stackId="s" fill="var(--success)" name="Positive" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={700} />
          <Bar dataKey="neutral" stackId="s" fill="var(--muted-foreground)" fillOpacity={0.4} name="Neutral" isAnimationActive animationDuration={900} />
          <Bar dataKey="negative" stackId="s" fill="var(--destructive)" name="Negative" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={1100} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-3 mt-2 text-[10.5px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-success" /> Positive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-muted-foreground/40" /> Neutral
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-destructive" /> Negative
        </span>
      </div>
    </div>
  );
}
