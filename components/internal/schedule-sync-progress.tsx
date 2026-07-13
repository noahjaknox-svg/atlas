"use client";

import { cn } from "@/lib/utils";

export function ScheduleSyncProgressBar({
  percent,
  detail,
  error,
  className,
}: {
  percent: number;
  detail: string;
  error?: string | null;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-atlas-muted">
        <span className={error ? "text-red-600" : undefined}>{error ?? detail}</span>
        <span className="tabular-nums">{error ? "—" : `${clamped}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-atlas-border/60">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            error ? "bg-red-500" : "bg-atlas-accent"
          )}
          style={{ width: `${error ? 100 : clamped}%` }}
        />
      </div>
    </div>
  );
}
