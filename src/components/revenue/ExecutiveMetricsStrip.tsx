"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Users,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(value * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className="tnum">
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

interface MetricItem {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "default" | "success" | "warning" | "destructive";
  delta?: string;
}

export function ExecutiveMetricsStrip() {
  const rm = useAppStore((s) => s.revenueMetrics);

  const items: MetricItem[] = [
    {
      label: "Today's Revenue",
      value: rm.todaysRevenueCents / 100,
      prefix: "₹",
      decimals: 0,
      icon: TrendingUp,
      accent: "success",
      delta: "+12.4%",
    },
    {
      label: "Revenue Protected",
      value: rm.revenueProtectedCents / 100,
      prefix: "₹",
      decimals: 0,
      icon: Shield,
      accent: "success",
      delta: "+8.1%",
    },
    {
      label: "Auto-Closed Deals",
      value: rm.autoClosedDeals,
      icon: Zap,
      accent: "default",
      delta: "+3",
    },
    {
      label: "Auto-Resolved Cases",
      value: rm.autoResolvedCases,
      icon: CheckCircle2,
      accent: "success",
    },
    {
      label: "Human Overrides",
      value: rm.humanOverrides,
      icon: AlertTriangle,
      accent: rm.humanOverrides > 5 ? "warning" : "default",
    },
    {
      label: "Conversion Rate",
      value: rm.conversionRate * 100,
      suffix: "%",
      decimals: 1,
      icon: ArrowUpRight,
      accent: "default",
    },
    {
      label: "Avg AI Confidence",
      value: rm.avgAIConfidence * 100,
      suffix: "%",
      decimals: 0,
      icon: BarChart3,
      accent: rm.avgAIConfidence > 0.85 ? "success" : "warning",
    },
    {
      label: "Policy Compliance",
      value: rm.policyCompliance * 100,
      suffix: "%",
      decimals: 0,
      icon: ShieldCheck,
      accent: rm.policyCompliance > 0.95 ? "success" : "warning",
    },
  ];

  const accentText: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  const accentIcon: Record<string, string> = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-4 lg:grid-cols-8 divide-x divide-border">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="px-4 py-3 first:pl-0 last:pr-0"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={cn("w-3 h-3 shrink-0", accentIcon[item.accent])} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                    {item.label}
                  </span>
                </div>
                <div className={cn("text-[17px] font-semibold tracking-tight leading-none", accentText[item.accent])}>
                  <AnimatedNumber
                    value={item.value}
                    prefix={item.prefix}
                    suffix={item.suffix}
                    decimals={item.decimals}
                  />
                </div>
                {item.delta && (
                  <div className="mt-0.5 text-[9.5px] text-success font-medium">{item.delta} vs yesterday</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
