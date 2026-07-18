"use client";

import { motion } from "framer-motion";
import { BookOpen, FileText, History, Package, User } from "lucide-react";
import type { RetrievalHit } from "@/types";
import { cn } from "@/lib/utils";

const sourceIcon = {
  policy: FileText,
  customer_history: User,
  order: Package,
  similar_case: History,
};

const sourceColor = {
  policy: "text-info",
  customer_history: "text-violet-500",
  order: "text-foreground",
  similar_case: "text-warning",
};

export function KnowledgeRetrieval({ hits }: { hits: RetrievalHit[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <BookOpen className="w-3.5 h-3.5 text-info" />
        <span className="text-[12px] font-semibold">Knowledge Retrieval</span>
        {hits.length > 0 && (
          <span className="ml-auto text-[10.5px] text-muted-foreground tnum">{hits.length} sources</span>
        )}
      </div>

      {hits.length === 0 ? (
        <div className="p-4 text-[11.5px] text-muted-foreground/70">
          No context retrieved yet. Run the retrieval stage to populate this panel with relevant policies,
          customer history, and similar cases.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {hits.map((hit, i) => {
            const Icon = sourceIcon[hit.source];
            const color = sourceColor[hit.source];
            return (
              <motion.div
                key={hit.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-medium">
                        {hit.source.replace(/_/g, " ")}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground/60">·</span>
                      <span className="text-[9.5px] text-muted-foreground tnum">
                        {(hit.relevance * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <div className="text-[12px] font-medium leading-snug">{hit.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {hit.snippet}
                    </div>
                    {/* Relevance bar */}
                    <div className="mt-1.5 h-0.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${hit.relevance * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full bg-foreground/70"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
