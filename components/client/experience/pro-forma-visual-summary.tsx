"use client";

import { useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCountUp } from "./use-count-up";
import { useReveal } from "./use-reveal";

type LineItem = { key: string; label: string; category: string; annual: number; monthly: number };

export function ProFormaVisualSummary({
  lineItems,
  period,
  onPeriodChange,
  compact = false,
}: {
  lineItems: LineItem[];
  period: "annual" | "monthly";
  onPeriodChange: (p: "annual" | "monthly") => void;
  compact?: boolean;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.2 });

  const { fixed, variable, total, topLines } = useMemo(() => {
    let fixedSum = 0;
    let variableSum = 0;
    for (const item of lineItems) {
      const v = period === "annual" ? item.annual : item.monthly;
      if (item.category === "variable" || item.key.includes("fuel") || item.key.includes("charter")) {
        variableSum += v;
      } else {
        fixedSum += v;
      }
    }
    const t = fixedSum + variableSum;
    const sorted = [...lineItems]
      .map((item) => ({
        ...item,
        value: period === "annual" ? item.annual : item.monthly,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, compact ? 4 : 6);
    return { fixed: fixedSum, variable: variableSum, total: t, topLines: sorted };
  }, [lineItems, period, compact]);

  const fixedPct = total > 0 ? (fixed / total) * 100 : 50;
  const animatedTotal = useCountUp(total, shown);

  return (
    <div ref={ref} className={cn(compact ? "shrink-0 space-y-3" : "mb-8 space-y-6")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Cost overview</p>
        <div className="flex rounded-lg border border-white/15 p-0.5">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors sm:px-4 sm:py-1.5",
                period === p
                  ? "bg-atlas-accent text-[#0B0F1A]"
                  : "text-white/60 hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid gap-4", compact ? "lg:grid-cols-[140px_1fr]" : "gap-6 lg:grid-cols-[200px_1fr]")}>
        <div className="flex flex-col items-center justify-center">
          <div
            className={cn(
              "relative rounded-full transition-[background] duration-500",
              compact ? "h-24 w-24" : "h-36 w-36"
            )}
            style={{
              background: `conic-gradient(#C9A227 0% ${fixedPct}%, rgba(255,255,255,0.15) ${fixedPct}% 100%)`,
            }}
            aria-hidden
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[#0B0F1A] text-center">
              <span className="text-[10px] uppercase tracking-wider text-white/50">Total</span>
              <span className="mt-1 font-mono text-sm tabular-nums text-atlas-accent">
                {total > 0 ? formatCurrency(animatedTotal) : "—"}
              </span>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-white/55">
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-atlas-accent" /> Fixed
            </span>
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-white/25" /> Variable
            </span>
          </div>
        </div>

        <div className={cn(compact ? "space-y-2" : "space-y-3")}>
          {topLines.length === 0 ? (
            <p className="text-sm text-white/45">Cost breakdown pending — complete workspace assumptions.</p>
          ) : (
            topLines.map((line) => {
              const pct = total > 0 ? (line.value / total) * 100 : 0;
              return (
                <div key={line.key}>
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-white/75">{line.label}</span>
                    <span className="shrink-0 font-mono tabular-nums text-white/60">
                      {formatCurrency(line.value)}
                    </span>
                  </div>
                  <div className={cn("mt-1 overflow-hidden rounded-full bg-white/10", compact ? "h-1.5" : "h-2")}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-atlas-accent/70 to-atlas-accent transition-[width] duration-700 ease-out"
                      style={{ width: shown ? `${pct}%` : "0%" }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
