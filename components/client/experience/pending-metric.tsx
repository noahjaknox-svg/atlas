"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

export function formatMetricValue(
  value: number | null | undefined,
  kind: "currency" | "number" | "hours" = "currency"
): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "Pending";
  }
  if (kind === "currency") return formatCurrency(value);
  if (kind === "hours") return formatNumber(Math.round(value));
  return formatNumber(value);
}

export function PendingMetric({
  label,
  value,
  kind = "currency",
  className,
}: {
  label: string;
  value: number | null | undefined;
  kind?: "currency" | "number" | "hours";
  className?: string;
}) {
  const pending = value == null || !Number.isFinite(value) || value === 0;
  const display = formatMetricValue(value, kind);

  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-wider text-white/50">{label}</dt>
      <dd
        className={`mt-2 font-mono text-xl tabular-nums ${
          pending ? "text-white/40 italic" : "text-white"
        }`}
      >
        {display}
      </dd>
    </div>
  );
}
