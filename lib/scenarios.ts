import { prisma } from "@/lib/db";
import { DEFAULT_SCENARIO_INPUTS, type ScenarioInput } from "@/lib/proforma";

export const SCENARIO_NAMES = ["Scenario A", "Scenario B (Base)", "Scenario C"] as const;

export async function ensureThreeScenarios(
  proposalId: string,
  aircraftInstanceId: string
) {
  const existing = await prisma.proposalScenario.findMany({
    where: { proposalId, aircraftInstanceId },
    orderBy: { scenarioIndex: "asc" },
  });

  if (existing.length >= 3) return existing;

  const created = [...existing];
  for (let i = 0; i < 3; i++) {
    const name = SCENARIO_NAMES[i];
    const found = existing.find((s) => s.scenarioName === name);
    if (found) continue;
    const def = DEFAULT_SCENARIO_INPUTS[i];
    const row = await prisma.proposalScenario.create({
      data: {
        proposalId,
        aircraftInstanceId,
        scenarioName: name,
        scenarioIndex: i,
        isBaseCase: i === 1,
        charterBlockHours: def.charterBlockHours,
        charterFlightHours: def.charterFlightHours,
        ownerHours: def.ownerFlightHours,
      },
    });
    created.push(row);
  }
  return created;
}

export function scenarioInputsFromDb(
  rows: Array<{
    scenarioName: string;
    charterBlockHours: { toString(): string } | null;
    charterFlightHours: { toString(): string } | null;
    ownerHours: { toString(): string } | null;
  }>
): ScenarioInput[] {
  const byName = Object.fromEntries(rows.map((r) => [r.scenarioName, r]));
  const inputs: ScenarioInput[] = [];
  for (let i = 0; i < 3; i++) {
    const row = byName[SCENARIO_NAMES[i]];
    const def = DEFAULT_SCENARIO_INPUTS[i];
    inputs.push({
      scenarioIndex: i,
      charterBlockHours: row?.charterBlockHours
        ? parseFloat(row.charterBlockHours.toString())
        : def.charterBlockHours,
      charterFlightHours: row?.charterFlightHours
        ? parseFloat(row.charterFlightHours.toString())
        : def.charterFlightHours,
      ownerFlightHours: row?.ownerHours
        ? parseFloat(row.ownerHours.toString())
        : def.ownerFlightHours,
    });
  }
  return inputs;
}
