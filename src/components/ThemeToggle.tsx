"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all duration-300 hover:shadow-md",
          className
        )}
      >
        {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-500" />}
      </button>
    );
  }

  return (
    <div className={cn("w-full rounded-2xl border border-border bg-card/80 p-2 shadow-sm backdrop-blur", className)}>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theme</p>
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="group relative flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 transition-all duration-300 hover:shadow-md"
      >
        <span className="text-sm font-medium text-foreground">{isDark ? "Dark Mode" : "Light Mode"}</span>
        <span className="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-200 p-1 transition-colors duration-300 dark:bg-slate-700">
          <span
            className={cn(
              "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300",
              isDark && "translate-x-7 bg-[#0D1B2A]"
            )}
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 text-amber-300" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-slate-600" />
            )}
          </span>
        </span>
      </button>
    </div>
  );
}
