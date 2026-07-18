"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Inline login gate rendered when no session exists.
 * The dedicated /login page also exists for direct navigation.
 */
export function LoginGate() {
  const [email, setEmail] = useState("avery@marigold.co");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (!res || res.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }
    // The page will re-render with the new session
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Tentacle</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Marigold &amp; Co
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-[16px] font-semibold mb-1">Sign in</h1>
          <p className="text-[12px] text-muted-foreground mb-4">
            Authenticate to access the operations dashboard
          </p>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 h-9 text-[13px]"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 h-9 text-[13px]"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] gap-1.5">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Demo credentials
            </div>
            <div className="space-y-1 text-[11px]">
              <button
                onClick={() => {
                  setEmail("avery@marigold.co");
                  setPassword("demo1234");
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted/40 transition-colors"
              >
                <span className="font-medium text-foreground">Agent</span>
                <span className="text-muted-foreground ml-2">avery@marigold.co / demo1234</span>
              </button>
              <button
                onClick={() => {
                  setEmail("bennett@marigold.co");
                  setPassword("demo1234");
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted/40 transition-colors"
              >
                <span className="font-medium text-foreground">Manager</span>
                <span className="text-muted-foreground ml-2">bennett@marigold.co / demo1234</span>
              </button>
              <button
                onClick={() => {
                  setEmail("admin@marigold.co");
                  setPassword("admin1234");
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-muted/40 transition-colors"
              >
                <span className="font-medium text-foreground">Admin</span>
                <span className="text-muted-foreground ml-2">admin@marigold.co / admin1234</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10.5px] text-muted-foreground mt-4">
          Protected by NextAuth · Session expires in 8 hours
        </p>
      </motion.div>
    </div>
  );
}
