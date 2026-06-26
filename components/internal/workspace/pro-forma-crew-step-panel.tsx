"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AssumptionMap } from "@/lib/assumptions";
import { CrewLadderStepper } from "@/components/shared/crew-ladder-stepper";
import {
  formatCrewLadderRung,
  mergeAssumptionsForCrewStep,
  parseDefaultMinimumCrewMinStep,
  parseDefaultMinimumPilots,
  resolveCrewStepFromAssumptions,
} from "@/lib/crew-step";
import { cn } from "@/lib/utils";

/** Collapsible crew step control for the workspace pro forma utilization scenario. */
export function ProFormaCrewStepPanel({
  assumptions,
  warehouseDefaults = {},
  ownerHours,
  onCrewChange,
}: {
  assumptions: AssumptionMap;
  warehouseDefaults?: Record<string, string>;
  ownerHours: number;
  onCrewChange: (next: AssumptionMap) => void;
}) {
  const [open, setOpen] = useState(false);

  const resolved = useMemo(() => {
    const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
    return resolveCrewStepFromAssumptions(merged, { ownerHours }, warehouseDefaults);
  }, [assumptions, warehouseDefaults, ownerHours]);

  const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
  const minPilots = parseDefaultMinimumPilots(merged);
  const minStep = parseDefaultMinimumCrewMinStep(merged);
  const ownerHoursLabel = Number.isFinite(ownerHours) ? `${ownerHours} hrs` : "—";

  const stepReason =
    resolved.stepIndex === resolved.requiredStep &&
    resolved.requiredStep > resolved.minStep
      ? "Owner hours"
      : resolved.stepIndex > resolved.minStep
        ? "Scenario adjustment"
        : minPilots != null
          ? "Default minimum"
          : "Baseline";

  return (
    <div className="border-b border-atlas-border/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-atlas-surface/40"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-atlas-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-atlas-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="atlas-label">Crew step applied</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-atlas-text">
            {formatCrewLadderRung(resolved.stepIndex)} · {resolved.totalPilots} pilots
          </p>
          <p className="atlas-caption mt-1 text-atlas-muted">
            {stepReason} · {ownerHoursLabel} owner hours
          </p>
        </div>
      </button>

      {open ? (
        <div className={cn("space-y-4 border-t border-atlas-border/40 px-4 py-4")}>
          <p className="text-xs leading-snug text-atlas-muted">
            Adjust pilots for this utilization scenario. Crew defaults and lead pilot are
            configured on the Crew tab.
          </p>

          <CrewLadderStepper
            assumptions={assumptions}
            warehouseDefaults={warehouseDefaults}
            ownerHours={ownerHours}
            onCrewChange={onCrewChange}
            variant="workspace"
            stepsOnly
          />

          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-muted">
                Default minimum pilots
              </dt>
              <dd className="font-medium">
                {minPilots != null
                  ? `${minPilots} pilots (${formatCrewLadderRung(minStep)})`
                  : formatCrewLadderRung(0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-muted">
                Required for owner hours
              </dt>
              <dd className="font-medium">
                {formatCrewLadderRung(resolved.requiredStep)} ({ownerHoursLabel})
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-muted">Active step</dt>
              <dd className="font-medium">{formatCrewLadderRung(resolved.stepIndex)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-muted">Applied from</dt>
              <dd className="font-medium">{stepReason}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
