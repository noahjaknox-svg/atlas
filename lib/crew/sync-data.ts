import type { PrismaClient } from "@prisma/client";
import type { CrewGridValues, CrewOperatingData } from "@/lib/crew/types";
import type { CrewOperatingWire } from "@/lib/crew/wire-format";
import { metricToWire, operatingToWire } from "@/lib/crew/wire-format";
import type { CrewAirportWire } from "@/lib/ourairports/crew-wire";
import { serializeCrewAirport } from "@/lib/ourairports/crew-wire";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import {
  CREW_SYNC_POLICY,
  resolvePerformanceModel,
  type CrewPerformanceModel,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";

export type CrewSyncPayload = {
  syncedAt: string;
  unchanged?: boolean;
  aircraftTypes: Array<{
    id: string;
    code: string;
    manufacturer: string;
    model: string;
    /** Optional; omitted when type has no model (Crew TypeDTO-safe). */
    performanceModel?: CrewPerformanceModel;
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
  /** Crew airport rows for fleet home bases (same shape as GET /api/v1/crew/airports). */
  airports: CrewAirportWire[];
  /** Org runway / alternate thresholds (Crew PolicyStore). */
  policy: CrewSyncPolicy;
};

export async function buildCrewSyncPayloadFromDb(
  db: PrismaClient,
  ifModifiedSince?: Date | null
): Promise<CrewSyncPayload> {
  const [types, fleet, grids] = await Promise.all([
    db.aircraftType.findMany({ orderBy: { code: "asc" } }),
    db.aircraftTail.findMany({
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    }),
    db.aircraftPerformanceGrid.findMany({
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
      policy: CREW_SYNC_POLICY,
    };
  }

  const homeBases = Array.from(
    new Set(
      fleet
        .map((f) => f.homeBase?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code))
    )
  );

  const airports: CrewAirportWire[] = [];
  for (const code of homeBases) {
    const ref = await findAirportReferenceByCode(db, code);
    if (ref) {
      airports.push(serializeCrewAirport(ref));
    }
  }

  return {
    syncedAt: new Date().toISOString(),
    aircraftTypes: types.map((t) => {
      const code = t.code ?? "";
      const performanceModel = resolvePerformanceModel(code, t.performanceModel);
      return {
        id: t.id,
        code,
        manufacturer: t.manufacturer ?? "",
        model: t.model ?? "",
        ...(performanceModel ? { performanceModel } : {}),
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
    fleet: fleet.map((f) => ({
      tailNumber: f.tailNumber,
      aircraftTypeId: f.aircraftType.code ?? "",
      status: f.status,
      homeBase: f.homeBase,
      serialNumber: f.serialNumber,
      // Promoted weight columns on the Tail take precedence over any values
      // still stored inside the operating JSON blob.
      operating: operatingToWire(mergeOperatingWithPromotedWeights(f)),
      updatedAt: f.updatedAt.toISOString(),
    })),
    performance: grids.map((g) => ({
      aircraftTypeId: g.aircraftType.code ?? "",
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
    policy: CREW_SYNC_POLICY,
  };
}

/** Merge a Tail's promoted weight columns over its operating JSON (columns win). */
function mergeOperatingWithPromotedWeights(tail: {
  operating: unknown;
  basicEmptyWeightLb: number | null;
  mtowLb: number | null;
  mzfwLb: number | null;
  maxBagWeightLb: number | null;
}): CrewOperatingData {
  const base = tail.operating as CrewOperatingData;
  return {
    ...base,
    ...(tail.basicEmptyWeightLb != null ? { basicEmptyWeightLb: tail.basicEmptyWeightLb } : {}),
    ...(tail.mtowLb != null ? { mtowLb: tail.mtowLb } : {}),
    ...(tail.mzfwLb != null ? { mzfwLb: tail.mzfwLb } : {}),
    ...(tail.maxBagWeightLb != null ? { maxBagWeightLb: tail.maxBagWeightLb } : {}),
  };
}

function maxDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
}
