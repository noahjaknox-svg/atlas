import type { CrewGridValues, CrewInitialDataFile, CrewOperatingData } from "@/lib/crew/types";
import { CREW_OPERATING_DEFAULTS } from "@/lib/crew/types";
import { metricFromWire } from "@/lib/crew/wire-format";
import { parsePerformanceModel } from "@/lib/crew/performance-model";

type RawExport = {
  aircraftTypes?: Array<{
    code: string;
    manufacturer: string;
    model: string;
    region?: string;
    performanceModel?: unknown;
  }>;
  fleet?: Array<{
    tailNumber: string;
    aircraftTypeCode?: string;
    aircraftTypeId?: string;
    status?: string;
    homeBase?: string | null;
    serialNumber?: string | null;
    operating?: Record<string, unknown>;
  }>;
  performance?: Array<{
    aircraftTypeCode?: string;
    aircraftTypeId?: string;
    metric: string;
    unit?: string;
    source?: string;
    axes: {
      pressureAltitudeFt: number[];
      weightLb: number[];
      oatC: number[];
    };
    values: CrewGridValues;
  }>;
};

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Accept Atlas import file or Crew app export (atlas_initial_data.json). */
export function parseOperatingFromWire(raw: unknown): CrewOperatingData {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = CREW_OPERATING_DEFAULTS;
  return {
    basicEmptyWeightLb: num(o.basicEmptyWeightLb ?? o.basicEmptyWeight, d.basicEmptyWeightLb),
    mtowLb: num(o.mtowLb ?? o.maxTakeoffWeight, d.mtowLb),
    mzfwLb: num(o.mzfwLb ?? o.maxZeroFuelWeight, d.mzfwLb),
    fullFuelLb: num(o.fullFuelLb ?? o.fullFuel, d.fullFuelLb),
    crewWeightLb: num(o.crewWeightLb ?? o.crewWeight, d.crewWeightLb),
    paxWeightSummer: num(o.paxWeightSummer, d.paxWeightSummer),
    paxWeightWinter: num(o.paxWeightWinter, d.paxWeightWinter),
    taxiFuelLb: num(o.taxiFuelLb ?? o.taxiFuel, d.taxiFuelLb),
    reserveFuelLb: num(o.reserveFuelLb ?? o.reserveFuel, d.reserveFuelLb),
    burnRateLbPerHr: num(o.burnRateLbPerHr ?? o.burnRate, d.burnRateLbPerHr),
    cruiseTasKts: num(o.cruiseTasKts ?? o.cruiseTAS, d.cruiseTasKts),
    cruiseAltitudeFt: num(o.cruiseAltitudeFt ?? o.cruiseAltFt, d.cruiseAltitudeFt),
    routePercent: num(o.routePercent, d.routePercent),
    seatCount: num(o.seatCount, d.seatCount),
    maxBagWeightLb: num(o.maxBagWeightLb ?? o.maxBagWeight, d.maxBagWeightLb),
    landingRunwayPercent: num(o.landingRunwayPercent, d.landingRunwayPercent),
    alternateRunwayPercent: num(o.alternateRunwayPercent, d.alternateRunwayPercent),
    wetRunwayPercent: num(o.wetRunwayPercent, d.wetRunwayPercent),
    singleRunwayAlternate: Boolean(
      o.singleRunwayAlternate ?? o.requireAltSingleRunway ?? d.singleRunwayAlternate
    ),
  };
}

function typeCode(
  row: { aircraftTypeCode?: string; aircraftTypeId?: string },
  fallback?: string
): string {
  const code = row.aircraftTypeCode ?? row.aircraftTypeId ?? fallback ?? "";
  return String(code).trim();
}

export function normalizeCrewInitialData(raw: unknown): CrewInitialDataFile {
  const data = raw as RawExport;
  if (!data.aircraftTypes?.length) {
    throw new Error("Invalid import: aircraftTypes required");
  }

  return {
    aircraftTypes: data.aircraftTypes.map((t) => {
      const performanceModel = parsePerformanceModel(t.performanceModel);
      return {
        code: t.code,
        manufacturer: t.manufacturer,
        model: t.model,
        ...(performanceModel ? { performanceModel } : {}),
      };
    }),
    fleet: (data.fleet ?? []).map((ac) => ({
      tailNumber: ac.tailNumber,
      aircraftTypeCode: typeCode(ac),
      status: (ac.status === "retired" ? "retired" : "active") as "active" | "retired",
      homeBase: ac.homeBase ?? null,
      serialNumber: ac.serialNumber ?? null,
      operating: parseOperatingFromWire(ac.operating),
    })),
    performance: (data.performance ?? []).map((grid) => ({
      aircraftTypeCode: typeCode(grid),
      metric: metricFromWire(grid.metric),
      unit: grid.unit ?? "ft",
      ...(grid.source ? { source: grid.source } : {}),
      axes: grid.axes,
      values: grid.values,
    })),
  };
}
