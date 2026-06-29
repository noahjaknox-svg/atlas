"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeAppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border-t border-atlas-border px-3 py-2">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-atlas-muted">
          Appearance
        </p>
        <div className="h-[84px]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="border-t border-atlas-border px-1 py-1">
      <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-atlas-muted">
        Appearance
      </p>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
              active ? "text-atlas-accent" : "text-atlas-text"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {active ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
