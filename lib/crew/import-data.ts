import type { PrismaClient, AircraftTailStatus, AircraftPerformanceMetric } from "@prisma/client";
import type { CrewGridValues, CrewInitialDataFile } from "@/lib/crew/types";
import { parseOperatingFromWire } from "@/lib/crew/normalize-initial-data";
import { metricFromWire } from "@/lib/crew/wire-format";
import {
  CREW_PERFORMANCE_MODEL_BY_CODE,
  parsePerformanceModel,
} from "@/lib/crew/performance-model";

export async function importCrewInitialData(
  db: PrismaClient,
  data: CrewInitialDataFile
) {
  const typeByCode = new Map<string, string>();

  for (const t of data.aircraftTypes) {
    const performanceModel =
      parsePerformanceModel(t.performanceModel) ??
      CREW_PERFORMANCE_MODEL_BY_CODE[t.code] ??
      null;
    const displayName =
      [t.manufacturer, t.model].filter(Boolean).join(" ").trim() || t.code;
    const row = await db.aircraftType.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        displayName,
        manufacturer: t.manufacturer,
        model: t.model,
        performanceModel: performanceModel ?? undefined,
      },
      update: {
        manufacturer: t.manufacturer,
        model: t.model,
        ...(performanceModel ? { performanceModel } : {}),
      },
    });
    typeByCode.set(t.code, row.id);
  }

  for (const ac of data.fleet) {
    const typeId = typeByCode.get(ac.aircraftTypeCode);
    if (!typeId) {
      throw new Error(`Unknown aircraft type code: ${ac.aircraftTypeCode}`);
    }
    const operating = parseOperatingFromWire(ac.operating);
    // Promote key airframe weights into dedicated Tail columns.
    const weightColumns = {
      basicEmptyWeightLb: operating.basicEmptyWeightLb,
      mtowLb: operating.mtowLb,
      mzfwLb: operating.mzfwLb,
      maxBagWeightLb: operating.maxBagWeightLb,
    };
    await db.aircraftTail.upsert({
      where: { tailNumber: ac.tailNumber },
      create: {
        tailNumber: ac.tailNumber,
        aircraftTypeId: typeId,
        status: (ac.status ?? "active") as AircraftTailStatus,
        homeBase: ac.homeBase ?? null,
        serialNumber: ac.serialNumber ?? null,
        operating,
        ...weightColumns,
      },
      update: {
        aircraftTypeId: typeId,
        status: (ac.status ?? "active") as AircraftTailStatus,
        homeBase: ac.homeBase ?? null,
        serialNumber: ac.serialNumber ?? null,
        operating,
        ...weightColumns,
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
    await db.aircraftPerformanceGrid.upsert({
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
        ...(grid.source ? { source: grid.source } : {}),
      },
      update: {
        unit: grid.unit ?? "ft",
        pressureAltitudeFt: grid.axes.pressureAltitudeFt,
        weightLb: grid.axes.weightLb,
        oatC: grid.axes.oatC,
        values: grid.values as CrewGridValues,
        ...(grid.source ? { source: grid.source } : {}),
      },
    });
  }

  return {
    types: data.aircraftTypes.length,
    fleet: data.fleet.length,
    performance: data.performance.length,
  };
}
