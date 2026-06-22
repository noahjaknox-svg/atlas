import { prisma } from "@/lib/db";
import {
  assumptionsToProFormaInputs,
  calculateProFormaScenarios,
  type ScenarioProFormaResult,
  type ScenarioInput,
} from "@/lib/proforma";
import { ensureThreeScenarios, scenarioInputsFromDb } from "@/lib/scenarios";
import { aircraftAssumptionCategory, mergeLegacyAssumptions } from "@/lib/aircraft-workspace";
import { resolveEffectiveAssumptionsForInstance } from "@/lib/resolve-aircraft-defaults";

export type ProFormaPayload = {
  scenarios: ScenarioProFormaResult[];
  scenarioInputs: ScenarioInput[];
  assumptionsMeta: { label: string; value: string; source: string }[];
  breakEvenBase: number | null;
};

export async function loadProFormaData(
  proposalId: string,
  aircraftInstanceId: string
): Promise<ProFormaPayload> {
  await ensureThreeScenarios(proposalId, aircraftInstanceId);

  const [assumptions, scenarioRows] = await Promise.all([
    prisma.proposalAssumption.findMany({ where: { proposalId } }),
    prisma.proposalScenario.findMany({
      where: { proposalId, aircraftInstanceId },
      orderBy: { scenarioIndex: "asc" },
    }),
  ]);

  const category = aircraftAssumptionCategory(aircraftInstanceId);
  let map = mergeLegacyAssumptions(
    assumptions.map((a) => ({
      category: a.category,
      assumptionName: a.assumptionName,
      value: a.value,
    })),
    category
  );
  map = await resolveEffectiveAssumptionsForInstance(aircraftInstanceId, map);

  const scenarioInputs = scenarioInputsFromDb(scenarioRows);
  const results = calculateProFormaScenarios(map, scenarioInputs);

  return {
    scenarios: results,
    scenarioInputs,
    assumptionsMeta: [
      { label: "Charter Rate (Block)", value: map.charter_rate, source: "Manual entry" },
      { label: "Payback %", value: map.charter_payback_pct, source: "PrismJet standard" },
      { label: "Avg Fuel Cost", value: map.home_fuel_price, source: "Blended" },
      { label: "Fuel Burn", value: map.fuel_burn_gph, source: "Aircraft reference" },
      { label: "PIC Salary", value: map.pic_salary, source: "NBAA benchmark" },
    ],
    breakEvenBase: results.find((r) => r.scenarioIndex === 1)?.breakEvenCharterHours ?? null,
  };
}
