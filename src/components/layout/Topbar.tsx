"use client";

import { Search, Bell, Command, Moon, Sun, Menu, Check, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/appStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ViewKey } from "@/store/appStore";
import { useSession, signOut } from "next-auth/react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const setView = useAppStore((s) => s.setView);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const cases = useAppStore((s) => s.cases);
  const openCase = useAppStore((s) => s.openCase);

  const escalatedCases = cases.filter((c) => c.status === "escalated");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+K opens command palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCommandPaletteOpen]);

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userRole = session?.user?.role ?? "agent";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarHue = (session?.user as { avatarHue?: number })?.avatarHue ?? 160;

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden text-muted-foreground"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center text-xs font-semibold">
          R
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">Tentacle</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-[11px] text-muted-foreground">AI Workforce for SMBs</span>
      </div>

      <div className="flex-1 max-w-md mx-auto sm:ml-6">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2 h-8 px-3 rounded-md bg-muted/40 border border-transparent hover:bg-muted/60 hover:border-border transition-colors text-[12.5px] text-muted-foreground"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search cases, customers, orders…</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 h-5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                <Sun className="w-3.5 h-3.5 hidden dark:block" />
                <Moon className="w-3.5 h-3.5 dark:hidden" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>

          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                    aria-label={`Notifications (${escalatedCases.length} escalations)`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {escalatedCases.length > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-[9px] font-semibold text-white flex items-center justify-center"
                      >
                        {escalatedCases.length}
                      </motion.span>
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {escalatedCases.length} escalation{escalatedCases.length !== 1 ? "s" : ""}
              </TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-[340px] p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <div className="text-[12px] font-semibold">Notifications</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {escalatedCases.length} case{escalatedCases.length !== 1 ? "s" : ""} awaiting human review
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {escalatedCases.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                      <Check className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div className="text-[12px] font-medium">All clear</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      No escalations pending.
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {escalatedCases.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          openCase(c.id);
                          setNotifOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                          <span className="text-[11.5px] font-medium truncate">
                            {c.caseNumber}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatRelativeTime(c.updatedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate pl-3.5">
                          {c.subject}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {escalatedCases.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[11px]"
                    onClick={() => {
                      setView("escalations" as ViewKey);
                      setNotifOpen(false);
                    }}
                  >
                    View escalation queue
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </TooltipProvider>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        {/* User menu with sign-out */}
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 h-8 rounded-md hover:bg-muted/40 transition-colors">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${avatarHue} 60% 55%), hsl(${avatarHue + 30} 65% 45%))`,
                }}
              >
                {userInitials}
              </div>
              <div className="hidden lg:block leading-tight text-left">
                <div className="text-[12px] font-medium">{userName}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{userRole}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[240px] p-0">
            <div className="px-3 py-3 border-b border-border">
              <div className="text-[12.5px] font-medium">{userName}</div>
              <div className="text-[11px] text-muted-foreground">{userEmail}</div>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/60 capitalize">
                {userRole}
              </div>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
