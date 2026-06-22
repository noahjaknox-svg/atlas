import type { AssumptionMap } from "@/lib/assumptions";
import { mergeWithDerived } from "@/lib/aircraft-calculated-fields";
import {
  applyCrewStepToAssumptions,
  parseUsageTiers,
  parseWarehouseBaseline,
  resolveCrewStep,
  warehouseMinStep,
} from "@/lib/crew-step";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";

export type ScenarioCrewInput = {
  ownerFlightHours: number;
  crewStepIndex?: number | null;
  leadPilotEnabled?: boolean | null;
};

/** Apply scenario crew step + owner hours; returns effective assumptions for P&L. */
export function applyScenarioCrewToAssumptions(
  base: AssumptionMap,
  scenario: ScenarioCrewInput
): AssumptionMap {
  const baseline = parseWarehouseBaseline(base);
  const tiers = parseUsageTiers(base);
  const minStep = warehouseMinStep(baseline.pic, baseline.sic);
  const leadEnabled =
    scenario.leadPilotEnabled != null
      ? scenario.leadPilotEnabled
      : base.lead_pilot_enabled === "yes";

  const resolved = resolveCrewStep({
    ownerHours: scenario.ownerFlightHours,
    userStep: scenario.crewStepIndex ?? undefined,
    minStep,
    tiers,
    leadEnabled,
    baselinePic: baseline.pic,
    baselineSic: baseline.sic,
  });

  const patched: AssumptionMap = {
    ...base,
    owner_annual_hours: String(scenario.ownerFlightHours),
    lead_pilot_enabled: leadEnabled ? "yes" : "no",
  };

  return mergeWithDerived(applyCrewStepToAssumptions(patched, resolved));
}

export function scenarioCharterHoursFromCrew(
  base: AssumptionMap,
  scenario: ScenarioCrewInput
): { charterBlockHours: number; charterFlightHours: number } {
  const effective = applyScenarioCrewToAssumptions(base, scenario);
  const profile = computeUtilizationProfile(effective);
  return {
    charterBlockHours: profile.charterRevenueHours,
    charterFlightHours: profile.availableCharterFlightHours,
  };
}

/** Sync Scenario B crew step into proposal assumptions for workspace configurator. */
export function syncBaseScenarioToAssumptions(
  base: AssumptionMap,
  scenario: ScenarioCrewInput
): AssumptionMap {
  const effective = applyScenarioCrewToAssumptions(base, scenario);
  return {
    ...base,
    crew_step_index: effective.crew_step_index ?? base.crew_step_index,
    lead_pilot_enabled: effective.lead_pilot_enabled ?? base.lead_pilot_enabled,
    pic_count: effective.pic_count ?? base.pic_count,
    sic_count: effective.sic_count ?? base.sic_count,
    max_annual_utilization: effective.max_annual_utilization ?? base.max_annual_utilization,
    owner_annual_hours: effective.owner_annual_hours ?? base.owner_annual_hours,
    charter_block_hours: effective.charter_block_hours,
    charter_flight_hours: effective.charter_flight_hours,
  };
}
