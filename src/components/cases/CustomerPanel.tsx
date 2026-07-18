"use client";

import { useAppStore } from "@/store/appStore";
import { motion } from "framer-motion";
import { Mail, Phone, Package, Clock, MapPin, Star } from "lucide-react";
import { useMemo } from "react";
import type { Customer, Order } from "@/types";
import { formatCurrency, formatRelativeTime, tierColor, orderStatusLabel, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function CustomerPanel({ customer, order }: { customer: Customer; order?: Order }) {
  const allOrders = useAppStore((s) => s.orders);
  const allCases = useAppStore((s) => s.cases);
  const openCase = useAppStore((s) => s.openCase);
  const orders = useMemo(
    () => allOrders.filter((o) => o.customerId === customer.id),
    [allOrders, customer.id]
  );
  const cases = useMemo(
    () => allCases.filter((c) => c.customerId === customer.id),
    [allCases, customer.id]
  );
  const tier = tierColor(customer.tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, hsl(${customer.avatarHue} 60% 55%), hsl(${customer.avatarHue + 30} 65% 45%))`,
          }}
        >
          {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate">{customer.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide", tier.bg, tier.text)}>
              <Star className="w-2.5 h-2.5" />
              {customer.tier}
            </span>
            <span className="text-[10.5px] text-muted-foreground">Since {formatDate(customer.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{customer.email}</span>
        </div>
        {customer.phone && (
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Lifetime Value</div>
          <div className="text-[14px] font-semibold tnum mt-0.5">
            ₹{customer.lifetimeValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders</div>
          <div className="text-[14px] font-semibold tnum mt-0.5">{customer.orderCount}</div>
        </div>
      </div>

      {/* Linked order */}
      {order && (
        <div className="rounded-lg border border-border p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Linked Order
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium">{order.orderNumber}</span>
            <span className={cn("text-[11px] font-medium", orderStatusLabel(order.status).color)}>
              {orderStatusLabel(order.status).label}
            </span>
          </div>
          <div className="space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <div
                  className="w-6 h-6 rounded-md shrink-0"
                  style={{ background: `hsl(${item.imageHue ?? 200} 50% 75%)` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-foreground/90">{item.name}</div>
                  <div className="text-muted-foreground">Qty {item.qty} · {formatCurrency(item.priceCents)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11.5px]">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tnum">{formatCurrency(order.totalCents, order.currency)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border space-y-1 text-[10.5px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-2.5 h-2.5" />
              Placed {formatRelativeTime(order.placedAt)}
              {order.deliveredAt && ` · delivered ${formatRelativeTime(order.deliveredAt)}`}
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-2.5 h-2.5 mt-0.5" />
              <span className="truncate">{order.shippingAddress}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent cases */}
      <div>
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          Case History ({cases.length})
        </div>
        {cases.length <= 1 ? (
          <div className="text-[10.5px] text-muted-foreground/70 italic px-2 py-1">
            No prior cases on file
          </div>
        ) : (
          <div className="space-y-1">
            {cases.slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => openCase(c.id)}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
              >
                <span className="text-[10.5px] text-muted-foreground font-mono shrink-0">{c.caseNumber}</span>
                <span className="text-[11px] truncate flex-1">{c.subject}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
