import type { AssumptionMap } from "@/lib/assumptions";
import {
  assumptionsToProFormaInputs,
  breakEvenCharterHours,
  type ScenarioInput,
  type ScenarioProFormaResult,
} from "@/lib/proforma";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";
import { applyScenarioCrewToAssumptions } from "@/lib/scenario-crew";
import { computeWorkspaceProFormaForClient } from "@/lib/workspace-proforma-client";

/** Three-scenario pro forma using the workspace statement engine (visibility-aware fixed costs). */
export function calculateWorkspaceProFormaScenarios(
  baseAssumptions: AssumptionMap,
  scenarios: ScenarioInput[]
): ScenarioProFormaResult[] {
  return scenarios.map((s) => {
    const effective = applyScenarioCrewToAssumptions(baseAssumptions, {
      ownerFlightHours: s.ownerFlightHours,
      crewStepIndex: s.crewStepIndex,
      leadPilotEnabled: s.leadPilotEnabled,
    });
    const profile = computeUtilizationProfile(effective);
    const { proForma } = computeWorkspaceProFormaForClient(effective);
    const fixedTotal =
      proForma.lineItems.find((item) => item.key === "total_fixed")?.annual ?? 0;

    const inputs = assumptionsToProFormaInputs(effective);
    inputs.totalFixedCosts = fixedTotal;
    inputs.charterRevenueHours = profile.charterRevenueHours;
    inputs.availableCharterFlightHours = profile.availableCharterFlightHours;
    inputs.ownerFlightHours = profile.ownerFlightHours;
    inputs.charterBlockHours = profile.charterRevenueHours;
    inputs.charterFlightHours = profile.availableCharterFlightHours;

    return {
      scenarioIndex: s.scenarioIndex,
      charterBlockHours: profile.charterRevenueHours,
      charterFlightHours: profile.availableCharterFlightHours,
      ownerFlightHours: s.ownerFlightHours,
      breakEvenCharterHours: breakEvenCharterHours(inputs),
      ...proForma,
    };
  });
}
