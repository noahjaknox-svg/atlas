import type { AssumptionMap } from "@/lib/assumptions";
import { prisma } from "@/lib/db";
import { perfTimed } from "@/lib/perf-log";
import {
  resolveAircraftDefaults,
  resolveWarehouseLineVisibilityDefaults,
} from "@/lib/resolve-aircraft-defaults";
import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import { applyWarehouseDefaults } from "@/lib/warehouse-assumption-seed";

/** Pull warehouse defaults into proposal assumptions and link the instance. */
export async function seedAircraftWarehouseAssumptions(params: {
  proposalId: string;
  category: string;
  aircraftInstanceId: string;
  initialAssumptions: AssumptionMap;
  mode?: "seed" | "refresh";
}): Promise<AssumptionMap> {
  return perfTimed("warehouse.seedAssumptions", async () => {
  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId: params.aircraftInstanceId,
    assumptions: params.initialAssumptions,
  });

  const mode = params.mode ?? "seed";
  const seeded = applyWarehouseDefaults(params.initialAssumptions, defaults, mode);

  if (mode === "seed" || !params.initialAssumptions[PROFORMA_VISIBILITY_KEY]?.trim()) {
    const visibility = await resolveWarehouseLineVisibilityDefaults({
      aircraftInstanceId: params.aircraftInstanceId,
      assumptions: seeded,
    });
    if (visibility) seeded[PROFORMA_VISIBILITY_KEY] = visibility;
  }

  const resolvedMasterId = defaults.aircraft_master_id?.trim();
  if (resolvedMasterId) {
    seeded.aircraft_master_id = resolvedMasterId;
    await prisma.aircraftInstance.update({
      where: { id: params.aircraftInstanceId },
      data: { aircraftTypeId: resolvedMasterId },
    });
  }

  for (const [assumptionName, value] of Object.entries(seeded)) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    await prisma.proposalAssumption.upsert({
      where: {
        proposalId_category_assumptionName: {
          proposalId: params.proposalId,
          category: params.category,
          assumptionName,
        },
      },
      create: {
        proposalId: params.proposalId,
        category: params.category,
        assumptionName,
        value: trimmed,
        sourceType: "manual",
      },
      update: { value: trimmed },
    });
  }

  return seeded;
  });
}
