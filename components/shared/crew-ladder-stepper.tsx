"use client";

import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  CREW_LADDER,
  crewStepFloor,
  formatCrewComposition,
  formatCrewLadderRung,
  mergeAssumptionsForCrewStep,
  parseDefaultMinimumCrewMinStep,
  parseDefaultMinimumPilots,
  patchAssumptionsWithCrewStep,
  resolveCrewStepFromAssumptions,
  totalPilotsAtStep,
} from "@/lib/crew-step";
import { cn } from "@/lib/utils";

export type CrewLadderStepperProps = {
  assumptions: AssumptionMap;
  warehouseDefaults?: Record<string, string>;
  ownerHours: number;
  onCrewChange?: (next: AssumptionMap) => void;
  /** Optional user step override (portal local state). */
  crewStepIndex?: number;
  variant?: "workspace" | "portal";
  readOnly?: boolean;
  /** Pro forma: step controls only — no ladder heading or composition summary. */
  stepsOnly?: boolean;
};

export function CrewLadderStepper({
  assumptions,
  warehouseDefaults = {},
  ownerHours,
  onCrewChange,
  crewStepIndex,
  variant = "workspace",
  readOnly = false,
  stepsOnly = false,
}: CrewLadderStepperProps) {
  const resolved = useMemo(() => {
    const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
    return resolveCrewStepFromAssumptions(
      merged,
      {
        ownerHours,
        userStep: crewStepIndex,
      },
      warehouseDefaults
    );
  }, [assumptions, warehouseDefaults, ownerHours, crewStepIndex]);

  const minPilots = parseDefaultMinimumPilots(
    mergeAssumptionsForCrewStep(assumptions, warehouseDefaults)
  );
  const minStep = parseDefaultMinimumCrewMinStep(
    mergeAssumptionsForCrewStep(assumptions, warehouseDefaults)
  );
  const floorStep = crewStepFloor(resolved);
  const maxStep = CREW_LADDER.length - 1;
  const floorPilotCount = totalPilotsAtStep(floorStep);

  function setStep(next: number) {
    if (readOnly || !onCrewChange) return;
    const step = Math.max(floorStep, Math.min(maxStep, next));
    onCrewChange(
      patchAssumptionsWithCrewStep(assumptions, warehouseDefaults, {
        userStep: step,
        ownerHours,
      })
    );
  }

  const isPortal = variant === "portal";

  const stepControls = !readOnly && onCrewChange ? (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Decrease pilot count"
        disabled={resolved.stepIndex <= floorStep}
        onClick={() => setStep(resolved.stepIndex - 1)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
          isPortal
            ? "border-white/20 bg-white/10 text-white disabled:opacity-40"
            : "border-atlas-border bg-atlas-bg text-atlas-text disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className="min-w-[2rem] text-center font-mono text-sm tabular-nums"
        title={`${resolved.totalPilots} pilots (floor ${floorPilotCount})`}
      >
        {resolved.totalPilots}
      </span>
      <button
        type="button"
        aria-label="Increase pilot count"
        disabled={resolved.stepIndex >= maxStep}
        onClick={() => setStep(resolved.stepIndex + 1)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
          isPortal
            ? "border-white/20 bg-white/10 text-white disabled:opacity-40"
            : "border-atlas-border bg-atlas-bg text-atlas-text disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  ) : readOnly ? (
    <span className="font-mono text-sm tabular-nums">{resolved.totalPilots} pilots</span>
  ) : null;

  if (stepsOnly) {
    return (
      <div className={cn("space-y-2", isPortal ? "text-sm text-white" : "text-sm text-atlas-text")}>
        <div className="flex items-start justify-between gap-4">
          <p className="min-w-0 font-mono text-sm tabular-nums">
            {formatCrewLadderRung(resolved.stepIndex)} · {resolved.totalPilots} pilots
          </p>
          {stepControls}
        </div>
        {resolved.requiredStep > resolved.minStep &&
        resolved.stepIndex === resolved.requiredStep ? (
          <p className={cn("text-xs", isPortal ? "text-amber-400/90" : "text-amber-600")}>
            Owner hours require this crew level or higher.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isPortal ? "text-sm text-white" : "text-sm text-atlas-text")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium",
              isPortal ? "text-xs uppercase tracking-[0.2em] text-atlas-accent" : "atlas-label"
            )}
          >
            {isPortal ? "Crew" : "Crew ladder"}
          </p>
          <p
            className={cn(
              "mt-1 font-mono tabular-nums",
              isPortal ? "text-sm text-white" : "atlas-caption text-atlas-text"
            )}
          >
            {formatCrewComposition(resolved)}
          </p>
          <p className={cn("mt-1 text-xs", isPortal ? "text-white/55" : "text-atlas-muted")}>
            {formatCrewLadderRung(resolved.stepIndex)} · {resolved.totalPilots} pilots
          </p>
          {resolved.requiredStep > resolved.minStep &&
          resolved.stepIndex === resolved.requiredStep ? (
            <p className={cn("mt-1 text-xs", isPortal ? "text-amber-400/90" : "text-amber-600")}>
              Owner hours require this crew level or higher.
            </p>
          ) : null}
          {minPilots != null ? (
            <p className={cn("mt-1 text-xs", isPortal ? "text-white/45" : "text-atlas-muted")}>
              Minimum: {minPilots} pilots ({formatCrewLadderRung(minStep)})
            </p>
          ) : null}
        </div>
        {stepControls}
      </div>
    </div>
  );
}
