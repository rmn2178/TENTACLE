"use client";

import { useSession } from "next-auth/react";
import { Shell } from "@/components/layout/Shell";
import { LoginGate } from "@/components/auth/LoginGate";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-lg bg-foreground/10 animate-pulse" />
            <div className="absolute inset-0 rounded-lg border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginGate />;
  }

  return <Shell />;
}
