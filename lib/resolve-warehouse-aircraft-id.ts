import { prisma } from "@/lib/db";

export type WarehouseIdResolution = {
  id: string | null;
  source: "instance" | "assumption" | "model_match" | null;
  staleAssumptionId: string | null;
};

async function warehouseAircraftExists(id: string): Promise<boolean> {
  const row = await prisma.warehouseAircraft.findUnique({
    where: { id },
    select: { id: true },
  });
  return row != null;
}

/** Resolve a warehouse aircraft id, healing stale/deleted assumption references. */
export async function resolveValidWarehouseAircraftId(params: {
  instanceWarehouseId?: string | null;
  assumptionMasterId?: string | null;
  manufacturer?: string | null;
  model?: string | null;
}): Promise<WarehouseIdResolution> {
  const staleAssumptionId = params.assumptionMasterId?.trim() || null;

  const instanceId = params.instanceWarehouseId?.trim();
  if (instanceId && (await warehouseAircraftExists(instanceId))) {
    return {
      id: instanceId,
      source: "instance",
      staleAssumptionId:
        staleAssumptionId && staleAssumptionId !== instanceId ? staleAssumptionId : null,
    };
  }

  const assumptionId = params.assumptionMasterId?.trim();
  if (assumptionId && (await warehouseAircraftExists(assumptionId))) {
    return { id: assumptionId, source: "assumption", staleAssumptionId: null };
  }

  const manufacturer = params.manufacturer?.trim();
  const model = params.model?.trim();
  if (manufacturer && model) {
    const match = await prisma.warehouseAircraft.findFirst({
      where: {
        status: "published",
        manufacturer: { equals: manufacturer, mode: "insensitive" },
        model: { equals: model, mode: "insensitive" },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (match) {
      return {
        id: match.id,
        source: "model_match",
        staleAssumptionId: assumptionId || null,
      };
    }
  }

  return { id: null, source: null, staleAssumptionId: assumptionId || null };
}
