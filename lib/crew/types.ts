/**
 * Crew operating block — wire keys match crew_data_sample.json / PrismJet Crew app.
 */
import { parseOperatingFromWire } from "@/lib/crew/normalize-initial-data";
export type CrewOperatingData = {
  basicEmptyWeightLb: number;
  mtowLb: number;
  mzfwLb: number;
  fullFuelLb: number;
  crewWeightLb: number;
  paxWeightSummer: number;
  paxWeightWinter: number;
  taxiFuelLb: number;
  reserveFuelLb: number;
  burnRateLbPerHr: number;
  cruiseTasKts: number;
  cruiseAltitudeFt: number;
  routePercent: number;
  seatCount: number;
  maxBagWeightLb: number;
  landingRunwayPercent: number;
  alternateRunwayPercent: number;
  wetRunwayPercent: number;
  singleRunwayAlternate: boolean;
};

export const CREW_OPERATING_DEFAULTS: CrewOperatingData = {
  basicEmptyWeightLb: 10250,
  mtowLb: 15000,
  mzfwLb: 13200,
  fullFuelLb: 5372,
  crewWeightLb: 400,
  paxWeightSummer: 190,
  paxWeightWinter: 195,
  taxiFuelLb: 80,
  reserveFuelLb: 400,
  burnRateLbPerHr: 520,
  cruiseTasKts: 310,
  cruiseAltitudeFt: 25000,
  routePercent: 100,
  seatCount: 9,
  maxBagWeightLb: 500,
  landingRunwayPercent: 60,
  alternateRunwayPercent: 70,
  wetRunwayPercent: 15,
  singleRunwayAlternate: false,
};

export const CREW_OPERATING_FIELD_META: Array<{
  key: keyof CrewOperatingData;
  label: string;
  type: "number" | "boolean";
}> = [
  { key: "basicEmptyWeightLb", label: "Basic empty weight (lb)", type: "number" },
  { key: "mtowLb", label: "MTOW (lb)", type: "number" },
  { key: "mzfwLb", label: "MZFW (lb)", type: "number" },
  { key: "fullFuelLb", label: "Full fuel (lb)", type: "number" },
  { key: "crewWeightLb", label: "Crew weight (lb)", type: "number" },
  { key: "paxWeightSummer", label: "Pax weight summer (lb)", type: "number" },
  { key: "paxWeightWinter", label: "Pax weight winter (lb)", type: "number" },
  { key: "taxiFuelLb", label: "Taxi fuel (lb)", type: "number" },
  { key: "reserveFuelLb", label: "Reserve fuel (lb)", type: "number" },
  { key: "burnRateLbPerHr", label: "Burn rate (lb/hr)", type: "number" },
  { key: "cruiseTasKts", label: "Cruise TAS (kts)", type: "number" },
  { key: "cruiseAltitudeFt", label: "Cruise altitude (ft)", type: "number" },
  { key: "routePercent", label: "Route %", type: "number" },
  { key: "seatCount", label: "Seat count", type: "number" },
  { key: "maxBagWeightLb", label: "Max bag weight (lb)", type: "number" },
  { key: "landingRunwayPercent", label: "Landing runway %", type: "number" },
  { key: "alternateRunwayPercent", label: "Alternate runway %", type: "number" },
  { key: "wetRunwayPercent", label: "Wet runway %", type: "number" },
  { key: "singleRunwayAlternate", label: "Single-runway alternate", type: "boolean" },
];

export function parseOperatingJson(raw: unknown): CrewOperatingData {
  return parseOperatingFromWire(raw);
}

export type CrewPerformanceAxes = {
  pressureAltitudeFt: number[];
  weightLb: number[];
  oatC: number[];
};

/** 3D grid: values[paIdx][weightIdx][oatIdx] — null outside certified envelope. */
export type CrewGridValues = Array<Array<Array<number | null>>>;

export type CrewInitialDataFile = {
  aircraftTypes: Array<{
    code: string;
    manufacturer: string;
    model: string;
  }>;
  fleet: Array<{
    tailNumber: string;
    aircraftTypeCode: string;
    status?: "active" | "retired";
    homeBase?: string | null;
    serialNumber?: string | null;
    operating: CrewOperatingData;
  }>;
  performance: Array<{
    aircraftTypeCode: string;
    metric: "takeoffFieldLength" | "landingDistance";
    unit?: string;
    axes: CrewPerformanceAxes;
    values: CrewGridValues;
  }>;
};
