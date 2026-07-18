"use client";

import { useAppStore } from "@/store/appStore";
import { CaseList } from "./CaseList";
import { Inbox, Filter, X, Search } from "lucide-react";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { intentLabel } from "@/lib/utils/format";

export function CaseInboxView() {
  const cases = useAppStore((s) => s.cases);
  const customers = useAppStore((s) => s.customers);
  const filterStatus = useAppStore((s) => s.filterStatus);
  const filterUrgency = useAppStore((s) => s.filterUrgency);
  const filterIntent = useAppStore((s) => s.filterIntent);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setFilterStatus = useAppStore((s) => s.setFilterStatus);
  const setFilterUrgency = useAppStore((s) => s.setFilterUrgency);
  const setFilterIntent = useAppStore((s) => s.setFilterIntent);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  // Build customer lookup map
  const customerMap = useMemo(() => {
    const m = new Map<string, (typeof customers)[number]>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterUrgency !== "all" && c.urgency !== filterUrgency) return false;
      if (filterIntent !== "all" && c.intent !== filterIntent) return false;
      if (q) {
        const customer = customerMap.get(c.customerId);
        const matches =
          c.caseNumber.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q) ||
          (c.intent && intentLabel(c.intent).toLowerCase().includes(q)) ||
          customer?.name.toLowerCase().includes(q) ||
          customer?.email.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [cases, filterStatus, filterUrgency, filterIntent, searchQuery, customerMap]);

  const newCount = cases.filter((c) => c.status === "new").length;
  const plannedCount = cases.filter((c) => c.status === "planned").length;
  const escalatedCount = cases.filter((c) => c.status === "escalated").length;

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterUrgency !== "all" ||
    filterIntent !== "all" ||
    searchQuery.trim().length > 0;

  function clearFilters() {
    setFilterStatus("all");
    setFilterUrgency("all");
    setFilterIntent("all");
    setSearchQuery("");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Case Inbox</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filtered.length} of {cases.length} cases shown · {newCount} new · {plannedCount} awaiting action ·{" "}
            {escalatedCount} escalated
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Inline search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-8 pr-7 w-[160px] text-[12px] bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[130px] text-[12px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="classified">Classified</SelectItem>
              <SelectItem value="retrieved">Retrieved</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="acted">Acted</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="h-8 w-[110px] text-[12px] bg-background">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All urgency</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterIntent} onValueChange={setFilterIntent}>
            <SelectTrigger className="h-8 w-[130px] text-[12px] bg-background">
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All intents</SelectItem>
              <SelectItem value="order_delay">Order Delay</SelectItem>
              <SelectItem value="damaged_item">Damaged Item</SelectItem>
              <SelectItem value="wrong_product">Wrong Product</SelectItem>
              <SelectItem value="refund_request">Refund Request</SelectItem>
              <SelectItem value="replacement_request">Replacement</SelectItem>
              <SelectItem value="cancellation_request">Cancellation</SelectItem>
              <SelectItem value="address_correction">Address Correction</SelectItem>
              <SelectItem value="return_eligibility">Return Eligibility</SelectItem>
              <SelectItem value="general_inquiry">General Inquiry</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-[12px] gap-1 text-muted-foreground"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-[13px] font-medium">
            {hasActiveFilters ? "No cases match these filters" : "No cases yet"}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            {hasActiveFilters
              ? "Try clearing the filters or adjusting your search."
              : "Create a new case from the Intake page to get started."}
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 text-[12px]"
              onClick={clearFilters}
            >
              <Filter className="w-3 h-3 mr-1.5" />
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <CaseList cases={filtered} />
      )}
    </div>
  );
}
