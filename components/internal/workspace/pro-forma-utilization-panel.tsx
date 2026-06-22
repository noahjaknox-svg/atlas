"use client";

import { useId, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import type { UtilizationProfile } from "@/lib/proforma-utilization";
import { HoursInput } from "@/components/ui/hours-input";
import { cn } from "@/lib/utils";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import {
  ownerHoursForUtilization,
  patchProformaOwnerHoursAtIndex,
  proformaHoursForProfiles,
  validateProformaOwnerHours,
} from "@/lib/proposal-owners";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  CREW_LADDER,
  crewStepFloor,
  formatCrewComposition,
  mergeAssumptionsForCrewStep,
  patchAssumptionsWithCrewStep,
  resolveCrewStepFromAssumptions,
  totalPilotsAtStep,
} from "@/lib/crew-step";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";

const METRICS_GRID =
  "grid grid-cols-[minmax(11rem,1fr)_minmax(4.5rem,max-content)] items-center gap-x-4 border-b border-atlas-border/40 px-4 py-2.5 last:border-b-0";

export function ProFormaScenarioPanel({
  profile,
  charterEnabled = true,
  ownerProfiles = [],
  onOwnerHoursChange,
  assumptions,
  warehouseDefaults = {},
  onCrewChange,
}: {
  profile: UtilizationProfile;
  charterEnabled?: boolean;
  ownerProfiles?: ProposalOwnerProfile[];
  onOwnerHoursChange: (hours: number) => void;
  assumptions: AssumptionMap;
  warehouseDefaults?: Record<string, string>;
  onCrewChange: (next: AssumptionMap) => void;
}) {
  const multiOwner = ownerProfiles.length > 1;
  const ownerHoursInputId = useId();
  const proformaHours = useMemo(
    () => proformaHoursForProfiles(ownerProfiles, assumptions),
    [ownerProfiles, assumptions]
  );
  const ownerHours = ownerHoursForUtilization(ownerProfiles, assumptions);

  const resolved = useMemo(() => {
    const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
    return resolveCrewStepFromAssumptions(merged, { ownerHours }, warehouseDefaults);
  }, [assumptions, warehouseDefaults, ownerHours]);

  const utilizationMetrics = useMemo(() => {
    const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
    const withCrew = {
      ...merged,
      owner_annual_hours: String(ownerHours),
      max_annual_utilization: String(resolved.maxAnnualUtilization),
      crew_step_index: String(resolved.stepIndex),
      pic_count: String(resolved.leadEnabled ? Math.max(0, resolved.crew.pic - 1) : resolved.crew.pic),
      sic_count: String(resolved.crew.sic),
      lead_pilot_enabled: resolved.leadEnabled ? "yes" : "no",
      lead_pilot_count: resolved.leadEnabled ? "1" : "0",
    };
    return computeUtilizationProfile(withCrew);
  }, [assumptions, warehouseDefaults, ownerHours, resolved]);

  const floorStep = crewStepFloor(resolved);
  const maxStep = CREW_LADDER.length - 1;
  const minPilots = totalPilotsAtStep(floorStep);

  const proformaHoursValidation = useMemo(
    () => validateProformaOwnerHours(ownerProfiles, assumptions, resolved.maxAnnualUtilization),
    [ownerProfiles, assumptions, resolved.maxAnnualUtilization]
  );

  function patchProformaHours(index: number, hours: number) {
    const withHours = patchProformaOwnerHoursAtIndex(
      assumptions,
      ownerProfiles,
      index,
      hours
    );
    const total = ownerHoursForUtilization(ownerProfiles, withHours);
    onCrewChange(
      patchAssumptionsWithCrewStep(withHours, warehouseDefaults, { ownerHours: total })
    );
  }

  function applyCrewPatch(patch: { userStep?: number; leadEnabled?: boolean }) {
    onCrewChange(
      patchAssumptionsWithCrewStep(assumptions, warehouseDefaults, {
        ...patch,
        ownerHours,
      })
    );
  }

  function setStep(next: number) {
    applyCrewPatch({ userStep: Math.max(floorStep, Math.min(maxStep, next)) });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-atlas-border/80 bg-atlas-surface/25">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title">Utilization scenario</h3>
      </div>

      <div className="border-b border-atlas-border/50 px-4 py-4">
        {multiOwner ? (
          <div>
            <p className="atlas-label">Owner flight hours</p>
            <p className="atlas-caption mt-1">
              Defaults set on the Owners tab — drives P&L below
            </p>
            <ul className="mt-3 space-y-3">
              {ownerProfiles.map((p, i) => (
                <li
                  key={p.sortOrder}
                  className="flex items-center justify-between gap-3 border-b border-atlas-border/30 pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm text-atlas-muted">{p.displayName}</span>
                  <HoursInput
                    min={0}
                    step={1}
                    className="atlas-input w-full max-w-[8rem] shrink-0 text-center sm:text-right"
                    value={Number.isFinite(proformaHours[i]) ? proformaHours[i] : 0}
                    onChange={(hours) => patchProformaHours(i, hours)}
                    aria-label={`${p.displayName} flight hours`}
                  />
                </li>
              ))}
            </ul>
            <p
              className={cn(
                "atlas-caption mt-3",
                proformaHoursValidation.maxHours > 0 &&
                  proformaHoursValidation.totalHours > proformaHoursValidation.maxHours
                  ? "text-amber-600"
                  : "text-atlas-muted"
              )}
            >
              Total owner hours:{" "}
              <span className="font-mono tabular-nums text-atlas-text">
                {proformaHoursValidation.totalHours}
              </span>
              {proformaHoursValidation.maxHours > 0 ? (
                <>
                  {" "}
                  / max{" "}
                  <span className="font-mono tabular-nums">
                    {proformaHoursValidation.maxHours}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor={ownerHoursInputId} className="atlas-label">
              Owner flight hours
            </label>
            <p className="atlas-caption mt-1">
              Defaults set on the Owners tab — drives P&L below
            </p>
            <HoursInput
              id={ownerHoursInputId}
              min={0}
              step={1}
              className="atlas-input mt-3 w-full max-w-[8rem] text-center sm:text-left"
              value={Number.isFinite(profile.ownerFlightHours) ? profile.ownerFlightHours : 0}
              onChange={onOwnerHoursChange}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 border-b border-atlas-border/50 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="atlas-label">Crew required</p>
            <p className="atlas-caption mt-1 font-mono tabular-nums text-atlas-text">
              {formatCrewComposition(resolved)}
            </p>
            {resolved.requiredStep > resolved.minStep &&
            resolved.stepIndex === resolved.requiredStep ? (
              <p className="mt-1 text-xs text-amber-600">
                Owner hours require this crew level or higher.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Decrease pilot count"
              disabled={resolved.stepIndex <= floorStep}
              onClick={() => setStep(resolved.stepIndex - 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border border-atlas-border bg-atlas-bg text-atlas-text",
                resolved.stepIndex <= floorStep && "cursor-not-allowed opacity-40"
              )}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="min-w-[2rem] text-center font-mono text-sm tabular-nums"
              title={`${resolved.totalPilots} pilots (minimum ${minPilots})`}
            >
              {resolved.totalPilots}
            </span>
            <button
              type="button"
              aria-label="Increase pilot count"
              disabled={resolved.stepIndex >= maxStep}
              onClick={() => setStep(resolved.stepIndex + 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border border-atlas-border bg-atlas-bg text-atlas-text",
                resolved.stepIndex >= maxStep && "cursor-not-allowed opacity-40"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="atlas-field-label">Include lead pilot</span>
          <input
            type="checkbox"
            checked={resolved.leadEnabled}
            onChange={(e) => applyCrewPatch({ leadEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-atlas-border accent-atlas-accent"
          />
        </label>
      </div>

      <div className="py-1">
        <MetricRow
          label="Max annual usage"
          value={fmtHours(utilizationMetrics.maxAnnualUsage)}
          muted={utilizationMetrics.maxAnnualUsage <= 0}
        />
        {charterEnabled ? (
          <>
            <MetricRow
              label="Available charter flight hours"
              value={fmtHours(utilizationMetrics.availableCharterFlightHours)}
            />
            <MetricRow
              label="Charter revenue hours"
              value={fmtHours(utilizationMetrics.charterRevenueHours)}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={METRICS_GRID}>
      <p className="atlas-proforma-line text-atlas-muted">{label}</p>
      <p
        className={cn(
          "shrink-0 whitespace-nowrap text-right font-mono text-sm tabular-nums text-atlas-accent",
          muted && "text-atlas-muted"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function fmtHours(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}
