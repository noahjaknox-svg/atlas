import type { PrismaClient, CrewFleetStatus, CrewPerformanceMetric } from "@prisma/client";
import type { CrewGridValues, CrewInitialDataFile } from "@/lib/crew/types";
import { parseOperatingFromWire } from "@/lib/crew/normalize-initial-data";
import { metricFromWire } from "@/lib/crew/wire-format";

export async function importCrewInitialData(
  db: PrismaClient,
  data: CrewInitialDataFile
) {
  const typeByCode = new Map<string, string>();

  for (const t of data.aircraftTypes) {
    const row = await db.crewAircraftType.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        manufacturer: t.manufacturer,
        model: t.model,
      },
      update: {
        manufacturer: t.manufacturer,
        model: t.model,
      },
    });
    typeByCode.set(t.code, row.id);
  }

  for (const ac of data.fleet) {
    const typeId = typeByCode.get(ac.aircraftTypeCode);
    if (!typeId) {
      throw new Error(`Unknown aircraft type code: ${ac.aircraftTypeCode}`);
    }
    await db.crewFleetAircraft.upsert({
      where: { tailNumber: ac.tailNumber },
      create: {
        tailNumber: ac.tailNumber,
        aircraftTypeId: typeId,
        status: (ac.status ?? "active") as CrewFleetStatus,
        homeBase: ac.homeBase ?? null,
        serialNumber: ac.serialNumber ?? null,
        operating: parseOperatingFromWire(ac.operating),
      },
      update: {
        aircraftTypeId: typeId,
        status: (ac.status ?? "active") as CrewFleetStatus,
        homeBase: ac.homeBase ?? null,
        serialNumber: ac.serialNumber ?? null,
        operating: parseOperatingFromWire(ac.operating),
      },
    });
  }

  for (const grid of data.performance) {
    const typeId = typeByCode.get(grid.aircraftTypeCode);
    if (!typeId) {
      throw new Error(`Unknown aircraft type code: ${grid.aircraftTypeCode}`);
    }
    const metric =
      typeof grid.metric === "string"
        ? metricFromWire(grid.metric)
        : grid.metric;
    await db.crewPerformanceGrid.upsert({
      where: {
        aircraftTypeId_metric: {
          aircraftTypeId: typeId,
          metric,
        },
      },
      create: {
        aircraftTypeId: typeId,
        metric,
        unit: grid.unit ?? "ft",
        pressureAltitudeFt: grid.axes.pressureAltitudeFt,
        weightLb: grid.axes.weightLb,
        oatC: grid.axes.oatC,
        values: grid.values as CrewGridValues,
      },
      update: {
        unit: grid.unit ?? "ft",
        pressureAltitudeFt: grid.axes.pressureAltitudeFt,
        weightLb: grid.axes.weightLb,
        oatC: grid.axes.oatC,
        values: grid.values as CrewGridValues,
      },
    });
  }

  return {
    types: data.aircraftTypes.length,
    fleet: data.fleet.length,
    performance: data.performance.length,
  };
}
