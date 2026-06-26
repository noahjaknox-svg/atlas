"use client";

import { cn } from "@/lib/utils";
import type { ClientCrewSummary } from "@/lib/workspace-proforma-client";

export function ProFormaUtilizationSummary({
  summary,
  totalOwnerHours,
  maxHours,
  compact = false,
}: {
  summary: ClientCrewSummary;
  totalOwnerHours: number;
  maxHours?: number;
  compact?: boolean;
}) {
  const overMax = maxHours != null && maxHours > 0 && totalOwnerHours > maxHours;

  return (
    <div
      className={cn(
        "rounded-lg border border-white/15 bg-white/5",
        compact ? "px-3 py-2.5" : "px-4 py-3"
      )}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-atlas-accent">Utilization</p>
      <dl className={cn("mt-2 space-y-2", compact && "mt-1.5 space-y-1.5")}>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-sm text-white/60">Max annual utilization</dt>
          <dd className="font-mono text-sm tabular-nums text-white">
            {summary.maxAnnualUtilization}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-sm text-white/60">Available charter flight hours</dt>
          <dd className="font-mono text-sm tabular-nums text-white">
            {Math.round(summary.charterFlightHours)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-sm text-white/60">Total owner hours</dt>
          <dd
            className={cn(
              "font-mono text-sm tabular-nums",
              overMax ? "text-amber-400" : "text-white"
            )}
          >
            {totalOwnerHours}
            {maxHours != null && maxHours > 0 ? (
              <span className="text-white/45"> / {maxHours}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {overMax ? (
        <p className="mt-2 text-xs text-amber-400/90">
          Total owner hours exceed max annual utilization for this crew level.
        </p>
      ) : null}
    </div>
  );
}
