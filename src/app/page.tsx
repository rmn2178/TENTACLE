"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace("/login");
    }
  }, [session, status, router]);

  if (status === "loading" || !session) {
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

  return <Shell />;
}
