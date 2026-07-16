import type { CrewOperatingData } from "@/lib/crew/types";
import type { AircraftPerformanceMetric } from "@prisma/client";

/** Operating block as PrismJet Crew app exports / expects on the wire. */
export type CrewOperatingWire = {
  basicEmptyWeight: number;
  maxTakeoffWeight: number;
  maxZeroFuelWeight: number;
  fullFuel: number;
  crewWeight: number;
  paxWeightSummer: number;
  paxWeightWinter: number;
  burnRate: number;
  taxiFuel: number;
  reserveFuel: number;
  cruiseTAS: number;
  cruiseAltFt: number;
  routePercent: number;
  seatCount: number;
  maxBagWeight: number;
  landingRunwayPercent: number;
  alternateRunwayPercent: number;
  wetRunwayPercent: number;
  requireAltSingleRunway: boolean;
};

export function operatingToWire(data: CrewOperatingData): CrewOperatingWire {
  return {
    basicEmptyWeight: data.basicEmptyWeightLb,
    maxTakeoffWeight: data.mtowLb,
    maxZeroFuelWeight: data.mzfwLb,
    fullFuel: data.fullFuelLb,
    crewWeight: data.crewWeightLb,
    paxWeightSummer: data.paxWeightSummer,
    paxWeightWinter: data.paxWeightWinter,
    burnRate: data.burnRateLbPerHr,
    taxiFuel: data.taxiFuelLb,
    reserveFuel: data.reserveFuelLb,
    cruiseTAS: data.cruiseTasKts,
    cruiseAltFt: data.cruiseAltitudeFt,
    routePercent: data.routePercent,
    seatCount: data.seatCount,
    maxBagWeight: data.maxBagWeightLb,
    landingRunwayPercent: data.landingRunwayPercent,
    alternateRunwayPercent: data.alternateRunwayPercent,
    wetRunwayPercent: data.wetRunwayPercent,
    requireAltSingleRunway: data.singleRunwayAlternate,
  };
}

const METRIC_TO_WIRE: Record<AircraftPerformanceMetric, string> = {
  takeoffFieldLength: "takeoff_field_length",
  landingDistance: "landing_distance",
};

const METRIC_FROM_WIRE: Record<string, AircraftPerformanceMetric> = {
  takeoff_field_length: "takeoffFieldLength",
  takeoffFieldLength: "takeoffFieldLength",
  landing_distance: "landingDistance",
  landingDistance: "landingDistance",
};

export function metricToWire(metric: AircraftPerformanceMetric): string {
  return METRIC_TO_WIRE[metric];
}

export function metricFromWire(metric: string): AircraftPerformanceMetric {
  const m = METRIC_FROM_WIRE[metric];
  if (!m) throw new Error(`Unknown performance metric: ${metric}`);
  return m;
}
