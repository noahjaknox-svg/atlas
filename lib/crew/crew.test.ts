import { describe, it, expect } from "vitest";
import { parseOperatingJson, CREW_OPERATING_DEFAULTS } from "@/lib/crew/types";
import { parseOperatingFromWire } from "@/lib/crew/normalize-initial-data";
import { normalizeCrewInitialData } from "@/lib/crew/normalize-initial-data";
import { metricToWire, operatingToWire } from "@/lib/crew/wire-format";
import { B300_PERFORMANCE_AXES, buildB300Grid } from "@/lib/crew/seed-grids";
import {
  B300_PERFORMANCE_MODEL,
  CREW_SYNC_POLICY,
  parsePerformanceModel,
  resolvePerformanceModel,
} from "@/lib/crew/performance-model";
import {
  computeRunwayGradientEstimated,
  computeRunwayGradientHighEndEstimated,
  runwayEndMatches,
} from "@/lib/ourairports/gradient";
import { servedRunwayGradient, serializeCrewAirport } from "@/lib/ourairports/crew-wire";

describe("runway gradient", () => {
  it("computes OurAirports estimate from end elevations", () => {
    const runway = {
      lengthFt: 5132,
      leElevationFt: 4700,
      heElevationFt: 4830,
      leIdent: "03",
      heIdent: "21",
    };
    expect(computeRunwayGradientEstimated(runway as never)).toBe(2.53);
    expect(computeRunwayGradientHighEndEstimated(runway as never)).toBe("21");
  });

  it("matches numeric runway end variants (3 ↔ 03R)", () => {
    expect(runwayEndMatches("03R", "3")).toBe(true);
    expect(runwayEndMatches("21L", "3")).toBe(false);
  });

  it("serves verified slope only; null when unverified", () => {
    const verified = servedRunwayGradient({
      gradientPctVerified: 1.8,
      gradientHighEndVerified: "21",
      gradientPctEstimated: 1.77,
    } as never);
    expect(verified.gradientPct).toBe(1.8);
    expect(verified.gradientHighEndRunway).toBe("21");

    const unverified = servedRunwayGradient({
      gradientPctVerified: null,
      gradientHighEndVerified: null,
      gradientPctEstimated: 0.72,
    } as never);
    expect(unverified.gradientPct).toBeNull();
    expect(unverified.gradientHighEndRunway).toBeNull();
  });

  it("does not use estimated slope for terrain when unverified", () => {
    const airport = serializeCrewAirport({
      icao: "KSDL",
      ident: "KSDL",
      name: "Scottsdale Airport",
      municipality: "Scottsdale",
      elevationFt: 1510,
      longestRunwayFt: 8249,
      latitudeDeg: null,
      longitudeDeg: null,
      keywords: null,
      updatedAt: new Date("2026-01-01"),
      runways: [
        {
          closed: false,
          lengthFt: 8249,
          widthFt: 100,
          surface: "ASP",
          lighted: true,
          leIdent: "03",
          heIdent: "21",
          gradientPctVerified: null,
          gradientHighEndVerified: null,
          gradientPctEstimated: 0.72,
        },
      ],
    } as never);
    expect(airport.gradientPct).toBeNull();
    expect(airport.terrain).toBe(false);
  });

  it("flags terrain from verified slope >= 0.5%", () => {
    const airport = serializeCrewAirport({
      icao: "KSEZ",
      ident: "KSEZ",
      name: "Sedona Airport",
      municipality: "Sedona",
      elevationFt: 4830,
      longestRunwayFt: 5132,
      latitudeDeg: null,
      longitudeDeg: null,
      keywords: null,
      updatedAt: new Date("2026-01-01"),
      runways: [
        {
          closed: false,
          lengthFt: 5132,
          widthFt: 100,
          surface: "ASP",
          lighted: true,
          leIdent: "03",
          heIdent: "21",
          gradientPctVerified: 1.8,
          gradientHighEndVerified: "21",
          gradientPctEstimated: 1.77,
        },
      ],
    } as never);
    expect(airport.gradientPct).toBe(1.8);
    expect(airport.terrain).toBe(true);
  });
});

describe("crew operating parse", () => {
  it("parses Crew app export field names", () => {
    const o = parseOperatingFromWire({
      basicEmptyWeight: 9872,
      maxTakeoffWeight: 15000,
      maxZeroFuelWeight: 12500,
      fullFuel: 3611,
      crewWeight: 400,
      paxWeightSummer: 190,
      paxWeightWinter: 195,
      burnRate: 750,
      taxiFuel: 100,
      reserveFuel: 800,
      cruiseTAS: 312,
      cruiseAltFt: 25000,
      routePercent: 6,
      seatCount: 9,
      maxBagWeight: 550,
      landingRunwayPercent: 60,
      alternateRunwayPercent: 70,
      wetRunwayPercent: 15,
      requireAltSingleRunway: true,
    });
    expect(o.basicEmptyWeightLb).toBe(9872);
    expect(o.burnRateLbPerHr).toBe(750);
    expect(o.singleRunwayAlternate).toBe(true);
  });

  it("round-trips to Crew wire format", () => {
    const internal = parseOperatingFromWire({ basicEmptyWeight: 9872, maxTakeoffWeight: 15000 });
    const wire = operatingToWire(internal);
    expect(wire.basicEmptyWeight).toBe(9872);
    expect(wire.maxTakeoffWeight).toBe(15000);
  });

  it("keeps summer and winter pax weights separate", () => {
    const o = parseOperatingJson({
      paxWeightSummer: 190,
      paxWeightWinter: 195,
    });
    expect(o.paxWeightSummer).toBe(190);
    expect(o.paxWeightWinter).toBe(195);
  });

  it("uses semantic GOM field names", () => {
    const o = parseOperatingJson({
      landingRunwayPercent: 60,
      alternateRunwayPercent: 70,
      wetRunwayPercent: 15,
    });
    expect(o.landingRunwayPercent).toBe(60);
    expect(o.alternateRunwayPercent).toBe(70);
    expect(o.wetRunwayPercent).toBe(15);
  });

  it("fills defaults for missing keys", () => {
    const o = parseOperatingJson({});
    expect(o.mtowLb).toBe(CREW_OPERATING_DEFAULTS.mtowLb);
  });
  it("maps performance metrics to snake_case on wire", () => {
    expect(metricToWire("takeoffFieldLength")).toBe("takeoff_field_length");
    expect(metricToWire("landingDistance")).toBe("landing_distance");
  });
});

describe("normalize Crew export", () => {
  it("accepts aircraftTypeId as type code on fleet rows", () => {
    const normalized = normalizeCrewInitialData({
      aircraftTypes: [{ code: "B300", manufacturer: "Beechcraft", model: "King Air 350" }],
      fleet: [
        {
          tailNumber: "N1213P",
          aircraftTypeId: "B300",
          operating: { basicEmptyWeight: 9872, maxTakeoffWeight: 15000 },
        },
      ],
      performance: [
        {
          aircraftTypeId: "B300",
          metric: "takeoff_field_length",
          axes: B300_PERFORMANCE_AXES,
          values: buildB300Grid("takeoffFieldLength"),
        },
      ],
    });
    expect(normalized.fleet[0].aircraftTypeCode).toBe("B300");
    expect(normalized.fleet[0].operating.basicEmptyWeightLb).toBe(9872);
    expect(normalized.performance[0].metric).toBe("takeoffFieldLength");
  });

  it("preserves optional performanceModel on types", () => {
    const normalized = normalizeCrewInitialData({
      aircraftTypes: [
        {
          code: "B300",
          manufacturer: "Beechcraft",
          model: "King Air 350",
          performanceModel: B300_PERFORMANCE_MODEL,
        },
        { code: "CL35", manufacturer: "Bombardier", model: "Challenger 350" },
      ],
      fleet: [],
      performance: [],
    });
    expect(normalized.aircraftTypes[0].performanceModel).toEqual(B300_PERFORMANCE_MODEL);
    expect(normalized.aircraftTypes[1].performanceModel).toBeUndefined();
  });
});

describe("performance model", () => {
  it("parses kingAir350 shape and rejects garbage", () => {
    expect(parsePerformanceModel(B300_PERFORMANCE_MODEL)).toEqual(B300_PERFORMANCE_MODEL);
    expect(parsePerformanceModel(null)).toBeNull();
    expect(parsePerformanceModel({ takeoffSlopePctPerPct: 0.08 })).toBeNull();
  });

  it("resolves B300 from code fallback when DB empty", () => {
    expect(resolvePerformanceModel("B300", null)).toEqual(B300_PERFORMANCE_MODEL);
    expect(resolvePerformanceModel("CL35", null)).toBeUndefined();
  });

  it("ships org policy defaults for sync", () => {
    expect(CREW_SYNC_POLICY.minRunwayFt).toBe(5000);
    expect(CREW_SYNC_POLICY.forecastLeadMinutes).toBe(120);
  });
});

describe("B300 performance grid", () => {
  it("builds 11×10×9 grid", () => {
    const grid = buildB300Grid("takeoffFieldLength");
    expect(grid.length).toBe(B300_PERFORMANCE_AXES.pressureAltitudeFt.length);
    expect(grid[0].length).toBe(B300_PERFORMANCE_AXES.weightLb.length);
    expect(grid[0][0].length).toBe(B300_PERFORMANCE_AXES.oatC.length);
  });

  it("includes null cells outside envelope", () => {
    const grid = buildB300Grid("takeoffFieldLength");
    const hasNull = grid.some((pa) => pa.some((w) => w.some((v) => v === null)));
    expect(hasNull).toBe(true);
  });
});
