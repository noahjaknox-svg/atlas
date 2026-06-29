"use client";

import { useCallback, useId, useMemo } from "react";
import { HoursInput } from "@/components/ui/hours-input";
import { cn } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import {
  mergeAssumptionsForCrewStep,
  patchAssumptionsWithCrewStep,
  resolveCrewStepFromAssumptions,
} from "@/lib/crew-step";
import {
  ownerHoursForUtilization,
  patchProformaOwnerHoursAtIndex,
  proformaHoursForProfiles,
  validateProformaOwnerHours,
} from "@/lib/proposal-owners";
import { ProFormaCrewStepPanel } from "@/components/internal/workspace/pro-forma-crew-step-panel";
import { ProFormaFinancingPanel } from "@/components/shared/pro-forma-financing-panel";
import {
  applyProformaScenarioOverlays,
  proformaFinancingScenarioPatch,
} from "@/lib/proforma-scenario-assumptions";
import { mergeAssumptionsWithDefaults } from "@/lib/resolve-effective-assumptions";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";
import {
  isFinancingScenarioVisible,
  assumptionsWithFinancingDefault,
} from "@/lib/financing-scenario";

const METRICS_GRID =
  "grid grid-cols-[minmax(11rem,1fr)_minmax(4.5rem,max-content)] items-center gap-x-4 border-b border-atlas-border/40 px-4 py-2.5 last:border-b-0";

export function ProFormaScenarioPanel({
  charterEnabled = true,
  ownerProfiles = [],
  onResetOwnerDefaults,
  assumptions,
  warehouseDefaults = {},
  onCrewChange,
}: {
  charterEnabled?: boolean;
  ownerProfiles?: ProposalOwnerProfile[];
  onResetOwnerDefaults?: () => void;
  assumptions: AssumptionMap;
  warehouseDefaults?: Record<string, string>;
  onCrewChange: (next: AssumptionMap) => void;
}) {
  const multiOwner = ownerProfiles.length > 1;
  const ownerHoursInputId = useId();
  const profilesForPatch = useMemo(() => {
    if (ownerProfiles.length > 0) return ownerProfiles;
    const hours = parseFloat(assumptions.owner_annual_hours ?? "400") || 400;
    return [
      {
        sortOrder: 0,
        displayName: "Owner",
        annualFlightHours: hours,
        ownershipPercent: 100,
      },
    ] satisfies ProposalOwnerProfile[];
  }, [ownerProfiles, assumptions.owner_annual_hours]);
  const proformaHours = useMemo(
    () => proformaHoursForProfiles(ownerProfiles, assumptions),
    [ownerProfiles, assumptions]
  );
  const ownerHours = ownerHoursForUtilization(ownerProfiles, assumptions);

  const configuratorEffective = useMemo(
    () =>
      assumptionsWithFinancingDefault(
        mergeAssumptionsWithDefaults(assumptions, warehouseDefaults)
      ),
    [assumptions, warehouseDefaults]
  );

  const financingVisible = isFinancingScenarioVisible(assumptions);
  const financingAssumptions = useMemo(
    () => applyProformaScenarioOverlays(configuratorEffective, assumptions),
    [assumptions, configuratorEffective]
  );

  const patchFinancingAssumptions = useCallback(
    (next: AssumptionMap) => {
      const scenarioPatch = proformaFinancingScenarioPatch(next, configuratorEffective);
      onCrewChange({ ...assumptions, ...scenarioPatch } as AssumptionMap);
    },
    [assumptions, configuratorEffective, onCrewChange]
  );

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

  const proformaHoursValidation = useMemo(
    () => validateProformaOwnerHours(ownerProfiles, assumptions, resolved.maxAnnualUtilization),
    [ownerProfiles, assumptions, resolved.maxAnnualUtilization]
  );

  function patchProformaHours(index: number, hours: number) {
    const withHours = patchProformaOwnerHoursAtIndex(
      assumptions,
      profilesForPatch,
      index,
      hours
    );
    const total = ownerHoursForUtilization(profilesForPatch, withHours);
    onCrewChange(
      patchAssumptionsWithCrewStep(withHours, warehouseDefaults, { ownerHours: total })
    );
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
              Defaults set in Owner flight hours & equity — drives P&L below
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
              Defaults set in Owner flight hours & equity — drives P&L below
            </p>
            <HoursInput
              id={ownerHoursInputId}
              min={0}
              step={1}
              className="atlas-input mt-3 w-full max-w-[8rem] text-center sm:text-left"
              value={Number.isFinite(proformaHours[0]) ? proformaHours[0] : 0}
              onChange={(hours) => patchProformaHours(0, hours)}
            />
          </div>
        )}
        {onResetOwnerDefaults ? (
          <button
            type="button"
            onClick={onResetOwnerDefaults}
            className="mt-3 text-sm text-atlas-accent hover:underline"
          >
            Reset to owner defaults
          </button>
        ) : null}
      </div>

      <ProFormaCrewStepPanel
        assumptions={assumptions}
        warehouseDefaults={warehouseDefaults}
        ownerHours={ownerHours}
        onCrewChange={onCrewChange}
      />

      <div>
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

      {financingVisible ? (
        <ProFormaFinancingPanel
          assumptions={financingAssumptions}
          onChange={patchFinancingAssumptions}
          defaultOpen={false}
          allowAircraftValueEdit
        />
      ) : null}
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
