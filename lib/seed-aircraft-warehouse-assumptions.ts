import type { AssumptionMap } from "@/lib/assumptions";
import { prisma } from "@/lib/db";
import { resolveAircraftDefaults } from "@/lib/resolve-aircraft-defaults";
import { applyWarehouseDefaults } from "@/lib/warehouse-assumption-seed";

/** Pull warehouse defaults into proposal assumptions and link the instance. */
export async function seedAircraftWarehouseAssumptions(params: {
  proposalId: string;
  category: string;
  aircraftInstanceId: string;
  initialAssumptions: AssumptionMap;
  mode?: "seed" | "refresh";
}): Promise<AssumptionMap> {
  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId: params.aircraftInstanceId,
    assumptions: params.initialAssumptions,
  });

  const seeded = applyWarehouseDefaults(
    params.initialAssumptions,
    defaults,
    params.mode ?? "seed"
  );

  const resolvedMasterId = defaults.aircraft_master_id?.trim();
  if (resolvedMasterId) {
    seeded.aircraft_master_id = resolvedMasterId;
    await prisma.aircraftInstance.update({
      where: { id: params.aircraftInstanceId },
      data: { warehouseAircraftId: resolvedMasterId },
    });
  }

  for (const [assumptionName, value] of Object.entries(seeded)) {
    const trimmed = value?.trim();
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
}
