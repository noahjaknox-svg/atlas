import type { PrismaClient } from "@prisma/client";
import type { CrewGridValues, CrewOperatingData } from "@/lib/crew/types";
import type { CrewOperatingWire } from "@/lib/crew/wire-format";
import { metricToWire, operatingToWire } from "@/lib/crew/wire-format";
import type { CrewAirportWire } from "@/lib/ourairports/crew-wire";
import { serializeCrewAirport } from "@/lib/ourairports/crew-wire";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import { decimalToNumber } from "@/lib/ourairports/lookup-utils";
import {
  loadAirportTimezoneOverrides,
  resolveCrewAirportTimeZone,
} from "@/lib/schedule/airport-timezones";
import {
  parsePerformanceModel,
  resolvePerformanceModel,
  type CrewPerformanceModel,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";
import { deriveAfmStatus } from "@/lib/crew/afm-status";
import { canonicalCrewTypeCode } from "@/lib/crew/type-codes";
import { loadCrewOrgPolicy } from "@/lib/crew/org-policy";

export type CrewSyncPayload = {
  syncedAt: string;
  unchanged?: boolean;
  aircraftTypes: Array<{
    id: string;
    code: string;
    manufacturer: string;
    model: string;
    performanceModel?: CrewPerformanceModel;
    afmStatus: "complete" | "partial" | "missing";
    afmNotes?: string;
    updatedAt: string;
  }>;
  fleet: Array<{
    tailNumber: string;
    aircraftTypeId: string;
    status: string;
    homeBase: string | null;
    serialNumber: string | null;
    operating: CrewOperatingWire;
    updatedAt: string;
  }>;
  performance: Array<{
    aircraftTypeId: string;
    metric: string;
    unit: string;
    axes: {
      pressureAltitudeFt: number[];
      weightLb: number[];
      oatC: number[];
    };
    values: CrewGridValues;
    source?: string;
    updatedAt: string;
  }>;
  airports: CrewAirportWire[];
  policy: CrewSyncPolicy;
};

export async function buildCrewSyncPayloadFromDb(
  db: PrismaClient,
  ifModifiedSince?: Date | null
): Promise<CrewSyncPayload> {
  const [types, fleet, grids, policy] = await Promise.all([
    db.aircraftType.findMany({ orderBy: { code: "asc" } }),
    db.aircraftTail.findMany({
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    }),
    db.aircraftPerformanceGrid.findMany({
      include: { aircraftType: true },
      orderBy: [{ aircraftType: { code: "asc" } }, { metric: "asc" }],
    }),
    loadCrewOrgPolicy(db),
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
      policy,
    };
  }

  const homeBases = Array.from(
    new Set(
      fleet
        .map((f) => f.homeBase?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code))
    )
  );

  const overridesByIcao = await loadAirportTimezoneOverrides(db, homeBases);
  const airports: CrewAirportWire[] = [];
  for (const code of homeBases) {
    const ref = await findAirportReferenceByCode(db, code);
    if (ref) {
      const icao = (ref.icao ?? ref.ident).toUpperCase();
      const lat = decimalToNumber(ref.latitudeDeg);
      const lon = decimalToNumber(ref.longitudeDeg);
      const timeZone = resolveCrewAirportTimeZone({
        icao,
        lat,
        lon,
        override: overridesByIcao[icao] ?? null,
      });
      airports.push(serializeCrewAirport(ref, { timeZone }));
    }
  }

  const gridsByTypeId = new Map<string, typeof grids>();
  for (const g of grids) {
    const list = gridsByTypeId.get(g.aircraftTypeId) ?? [];
    list.push(g);
    gridsByTypeId.set(g.aircraftTypeId, list);
  }

  return {
    syncedAt: new Date().toISOString(),
    aircraftTypes: types.map((t) => {
      const code = canonicalCrewTypeCode(t.code ?? "");
      // King Air code fallback only for B300 — never for jets.
      const performanceModel =
        code === "B300"
          ? resolvePerformanceModel(code, t.performanceModel)
          : (parsePerformanceModel(t.performanceModel) ?? undefined);
      const typeGrids = gridsByTypeId.get(t.id) ?? [];
      const { afmStatus, afmNotes } = deriveAfmStatus({
        code,
        hasPerformanceModel: Boolean(performanceModel),
        grids: typeGrids.map((g) => ({
          metric: g.metric,
          source: g.source,
        })),
        storedAfmNotes: t.afmNotes,
      });
      return {
        id: t.id,
        code,
        manufacturer: t.manufacturer ?? "",
        model: t.model ?? "",
        ...(performanceModel ? { performanceModel } : {}),
        afmStatus,
        ...(afmNotes ? { afmNotes } : {}),
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
    fleet: fleet.map((f) => ({
      tailNumber: f.tailNumber,
      aircraftTypeId: canonicalCrewTypeCode(f.aircraftType.code ?? ""),
      status: f.status,
      homeBase: f.homeBase,
      serialNumber: f.serialNumber,
      operating: operatingToWire(mergeOperatingWithPromotedWeights(f)),
      updatedAt: f.updatedAt.toISOString(),
    })),
    performance: grids.map((g) => ({
      aircraftTypeId: canonicalCrewTypeCode(g.aircraftType.code ?? ""),
      metric: metricToWire(g.metric),
      unit: g.unit,
      axes: {
        pressureAltitudeFt: g.pressureAltitudeFt,
        weightLb: g.weightLb,
        oatC: g.oatC,
      },
      values: g.values as CrewGridValues,
      ...(g.source ? { source: g.source } : {}),
      updatedAt: g.updatedAt.toISOString(),
    })),
    airports,
    policy,
  };
}

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
