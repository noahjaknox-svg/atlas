"use client";

import { useMemo } from "react";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  crewLadderReferenceRungs,
  formatCrewLadderRung,
  mergeAssumptionsForCrewStep,
  parseDefaultMinimumCrewMinStep,
  parseDefaultMinimumPilots,
  stepIndexForTotalPilots,
} from "@/lib/crew-step";
import { cn } from "@/lib/utils";

export function CrewLadderExplainer({
  assumptions,
  warehouseDefaults,
}: {
  assumptions: AssumptionMap;
  warehouseDefaults: Record<string, string>;
}) {
  const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
  const minPilots = parseDefaultMinimumPilots(merged);
  const minStep = parseDefaultMinimumCrewMinStep(merged);

  const rungs = useMemo(
    () => crewLadderReferenceRungs(assumptions, warehouseDefaults, 8),
    [assumptions, warehouseDefaults]
  );

  return (
    <section className="atlas-workspace-section min-w-0 overflow-hidden">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title">Crew Ladder</h3>
      </div>
      <ol className="divide-y divide-atlas-border/40 text-sm text-atlas-text">
        {rungs.map(({ stepIndex, crew, pilots, maxUsage }) => {
          const isDefault = minPilots != null && stepIndex === minStep;
          return (
            <li
              key={stepIndex}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2 text-xs",
                isDefault && "bg-atlas-surface/30 font-medium"
              )}
            >
              <span>
                Step {stepIndex}: {crew.pic} PIC + {crew.sic} SIC ({pilots} pilots)
              </span>
              <span className="shrink-0 tabular-nums text-atlas-muted">
                {maxUsage > 0 ? `${maxUsage.toLocaleString()} hrs max` : "—"}
                {isDefault ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wide">Min</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Helper text for default_minimum_crew field (total pilots → ladder step). */
export function formatDefaultMinimumCrewHint(raw: string): string | undefined {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const step = stepIndexForTotalPilots(n);
  return `${n} pilots → ${formatCrewLadderRung(step)}`;
}
