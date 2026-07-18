import type { CaseStatus, Intent, Sentiment, Urgency, CustomerTier, OrderStatus, Channel } from "@/types";

export function formatCurrency(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "ago" : "from now";

  if (abs < 60_000) return diff >= 0 ? "just now" : "in a moment";
  if (abs < 3_600_000) {
    const mins = Math.floor(abs / 60_000);
    return `${mins}m ${sign}`;
  }
  if (abs < 86_400_000) {
    const hrs = Math.floor(abs / 3_600_000);
    return `${hrs}h ${sign}`;
  }
  const days = Math.floor(abs / 86_400_000);
  if (days < 7) return `${days}d ${sign}`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ${sign}`;
  }
  const months = Math.floor(days / 30);
  return `${months}mo ${sign}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Status styling ────────────────────────────────────────────────────────────

export function statusColor(status: CaseStatus): {
  bg: string;
  text: string;
  dot: string;
  label: string;
} {
  switch (status) {
    case "new":
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        dot: "bg-muted-foreground",
        label: "New",
      };
    case "classified":
      return {
        bg: "bg-info/10",
        text: "text-info",
        dot: "bg-info",
        label: "Classified",
      };
    case "retrieved":
      return {
        bg: "bg-info/10",
        text: "text-info",
        dot: "bg-info",
        label: "Context Retrieved",
      };
    case "planned":
      return {
        bg: "bg-warning/15",
        text: "text-warning",
        dot: "bg-warning",
        label: "Plan Ready",
      };
    case "acted":
      return {
        bg: "bg-warning/15",
        text: "text-warning",
        dot: "bg-warning",
        label: "Executing",
      };
    case "resolved":
      return {
        bg: "bg-success/12",
        text: "text-success",
        dot: "bg-success",
        label: "Resolved",
      };
    case "escalated":
      return {
        bg: "bg-destructive/10",
        text: "text-destructive",
        dot: "bg-destructive",
        label: "Escalated",
      };
  }
}

export function urgencyColor(u: Urgency): { bg: string; text: string; label: string } {
  switch (u) {
    case "low":
      return { bg: "bg-muted", text: "text-muted-foreground", label: "Low" };
    case "medium":
      return { bg: "bg-info/10", text: "text-info", label: "Medium" };
    case "high":
      return { bg: "bg-warning/15", text: "text-warning", label: "High" };
    case "critical":
      return { bg: "bg-destructive/10", text: "text-destructive", label: "Critical" };
  }
}

export function sentimentColor(s: Sentiment): { text: string; label: string } {
  switch (s) {
    case "positive":
      return { text: "text-success", label: "Positive" };
    case "neutral":
      return { text: "text-muted-foreground", label: "Neutral" };
    case "negative":
      return { text: "text-warning", label: "Negative" };
    case "frustrated":
      return { text: "text-orange-600 dark:text-orange-400", label: "Frustrated" };
    case "furious":
      return { text: "text-destructive", label: "Furious" };
  }
}

export function tierColor(t: CustomerTier): { bg: string; text: string } {
  switch (t) {
    case "standard":
      return { bg: "bg-muted", text: "text-muted-foreground" };
    case "silver":
      return { bg: "bg-slate-200 dark:bg-slate-700", text: "text-slate-700 dark:text-slate-200" };
    case "gold":
      return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" };
    case "platinum":
      return { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" };
  }
}

export function intentLabel(i: Intent): string {
  const map: Record<Intent, string> = {
    order_delay: "Order Delay",
    damaged_item: "Damaged Item",
    wrong_product: "Wrong Product",
    refund_request: "Refund Request",
    replacement_request: "Replacement Request",
    cancellation_request: "Cancellation",
    address_correction: "Address Correction",
    return_eligibility: "Return Eligibility",
    general_inquiry: "General Inquiry",
    escalation: "Escalation",
  };
  return map[i];
}

export function channelLabel(c: Channel): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function orderStatusLabel(s: OrderStatus): { label: string; color: string } {
  switch (s) {
    case "placed":
      return { label: "Placed", color: "text-muted-foreground" };
    case "shipped":
      return { label: "Shipped", color: "text-info" };
    case "delivered":
      return { label: "Delivered", color: "text-success" };
    case "delayed":
      return { label: "Delayed", color: "text-destructive" };
    case "cancelled":
      return { label: "Cancelled", color: "text-muted-foreground" };
    case "returned":
      return { label: "Returned", color: "text-warning" };
  }
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
