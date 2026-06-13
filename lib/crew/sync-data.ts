import type { PrismaClient } from "@prisma/client";
import type { CrewGridValues, CrewOperatingData } from "@/lib/crew/types";
import type { CrewOperatingWire } from "@/lib/crew/wire-format";
import { metricToWire, operatingToWire } from "@/lib/crew/wire-format";
import type { AirportReferenceWire } from "@/lib/ourairports/types";
import {
  enrichAirportReference,
  findAirportReferenceByCode,
} from "@/lib/ourairports/lookup";

export type CrewSyncPayload = {
  syncedAt: string;
  unchanged?: boolean;
  aircraftTypes: Array<{
    id: string;
    code: string;
    manufacturer: string;
    model: string;
    updatedAt: string;
  }>;
  fleet: Array<{
    tailNumber: string;
    /** Type code on the wire (e.g. B300) — matches Crew app export. */
    aircraftTypeId: string;
    status: string;
    homeBase: string | null;
    serialNumber: string | null;
    operating: CrewOperatingWire;
    updatedAt: string;
  }>;
  performance: Array<{
    /** Type code on the wire (e.g. B300). */
    aircraftTypeId: string;
    metric: string;
    unit: string;
    axes: {
      pressureAltitudeFt: number[];
      weightLb: number[];
      oatC: number[];
    };
    values: CrewGridValues;
    updatedAt: string;
  }>;
  /** OurAirports reference rows for fleet home bases (ICAO-keyed). */
  airports: AirportReferenceWire[];
};

export async function buildCrewSyncPayloadFromDb(
  db: PrismaClient,
  ifModifiedSince?: Date | null
): Promise<CrewSyncPayload> {
  const [types, fleet, grids] = await Promise.all([
    db.crewAircraftType.findMany({ orderBy: { code: "asc" } }),
    db.crewFleetAircraft.findMany({
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    }),
    db.crewPerformanceGrid.findMany({
      include: { aircraftType: true },
      orderBy: [{ aircraftType: { code: "asc" } }, { metric: "asc" }],
    }),
  ]);

  const latest = maxDate([
    ...types.map((t) => t.updatedAt),
    ...fleet.map((f) => f.updatedAt),
    ...grids.map((g) => g.updatedAt),
  ]);

  if (ifModifiedSince && latest && latest <= ifModifiedSince) {
    return {
      syncedAt: new Date().toISOString(),
      unchanged: true,
      aircraftTypes: [],
      fleet: [],
      performance: [],
      airports: [],
    };
  }

  const homeBases = Array.from(
    new Set(
      fleet
        .map((f) => f.homeBase?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code))
    )
  );

  const airports: AirportReferenceWire[] = [];
  for (const code of homeBases) {
    const ref = await findAirportReferenceByCode(db, code);
    if (ref) {
      airports.push(await enrichAirportReference(db, ref));
    }
  }

  return {
    syncedAt: new Date().toISOString(),
    aircraftTypes: types.map((t) => ({
      id: t.id,
      code: t.code,
      manufacturer: t.manufacturer,
      model: t.model,
      updatedAt: t.updatedAt.toISOString(),
    })),
    fleet: fleet.map((f) => ({
      tailNumber: f.tailNumber,
      aircraftTypeId: f.aircraftType.code,
      status: f.status,
      homeBase: f.homeBase,
      serialNumber: f.serialNumber,
      operating: operatingToWire(f.operating as CrewOperatingData),
      updatedAt: f.updatedAt.toISOString(),
    })),
    performance: grids.map((g) => ({
      aircraftTypeId: g.aircraftType.code,
      metric: metricToWire(g.metric),
      unit: g.unit,
      axes: {
        pressureAltitudeFt: g.pressureAltitudeFt,
        weightLb: g.weightLb,
        oatC: g.oatC,
      },
      values: g.values as CrewGridValues,
      updatedAt: g.updatedAt.toISOString(),
    })),
    airports,
  };
}

function maxDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
}
