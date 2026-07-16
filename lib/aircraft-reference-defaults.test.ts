import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    aircraftType: { findUnique: vi.fn() },
    fboHangarOverride: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/company-settings", () => ({
  getCompanySettings: vi.fn(),
}));

vi.mock("@/lib/fbo-airport-lookup", () => ({
  findFbosAtAirport: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";

const AIRCRAFT = {
  id: "wa-1",
  displayName: "Challenger 350",
  manufacturer: "Bombardier",
  model: "Challenger 350",
  modelCode: "CL35",
  squareFootage: 930,
  passengerCapacity: 9,
  emptyRange: 3200,
  averageCruiseSpeed: 459,
  wifi: true,
  averageCost: 11000000,
  fuelGallonsPerHour: 300,
  homeFuelPct: 70,
  engineProgram: 1150,
  apuProgram: 90,
  partsProgram: 495,
  inspectionReserve: 75,
  tripExpenseHourly: 250,
  charterHourlyRate: 6000,
  fuelSurcharge: 600,
  pilotCharterIncentive: 113,
  charterPaybackBasis: "block_hours",
  fuelSurchargePaybackBasis: "flight_hours",
  defaultMinimumCrew: 2,
  leadPilotSalary: 240000,
  leadPilotTrainingCost: 15666,
  picSalary: 240000,
  sicSalary: 150000,
  picTrainingCost: 15666,
  sicTrainingCost: 15667,
  maxUsage1Pilot: 200,
  maxUsage2Pilots: 450,
  maxUsage3Pilots: 600,
  maxUsage4Pilots: 700,
  maxUsage5Pilots: 800,
  maxUsage6Pilots: 900,
};

const SETTINGS = {
  id: "default",
  usAverageFuelCost: 5.5,
  annualManagementFee: 120000,
  annualMaintenanceManagementFee: 60000,
  charterPaybackPercent: 82.5,
  crewBenefitsPercent: 0.16,
  fuelTaxRefund: 0.175,
};

describe("loadAircraftReferenceDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompanySettings).mockResolvedValue(SETTINGS as never);
    vi.mocked(findFbosAtAirport).mockResolvedValue([]);
  });

  it("maps hourly rates, finances, crew ladder step, and company defaults", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(AIRCRAFT as never);

    const map = await loadAircraftReferenceDefaults({ aircraftTypeId: "wa-1" });

    expect(map.engine_program_rate).toBe("1150");
    expect(map.home_fuel_pct).toBe("70");
    expect(map.typical_range).toBe("3200");
    expect(map.typical_cruise_speed).toBe("459");
    expect(map.wifi_features).toBe("Yes");
    expect(map.default_minimum_crew).toBe("2");
    expect(map.lead_pilot_training).toBe("15666");
    expect(map.management_fee).toBe("120000");
    expect(map.pic_salary).toBe("240000");
    expect(map.sic_salary).toBe("150000");
    expect(map.aircraft_year).toBeUndefined();
    expect(map.pic_count).toBeUndefined();
  });

  it("maps null default minimum crew and lead training to zero in Pulled", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue({
      ...AIRCRAFT,
      defaultMinimumCrew: null,
      leadPilotTrainingCost: null,
    } as never);

    const map = await loadAircraftReferenceDefaults({ aircraftTypeId: "wa-1" });

    expect(map.default_minimum_crew).toBe("0");
    expect(map.lead_pilot_training).toBe("0");
  });

  it("uses FBO base fuel rate and sqft-derived hangar when an FBO matches", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(AIRCRAFT as never);
    vi.mocked(findFbosAtAirport).mockResolvedValue([
      {
        id: "fbo-1",
        fboName: "PrismJet",
        airportIcao: "KSDL",
        baseFuelRate: { toString: () => "6.25" },
        hangarCostPerSqft: 24,
      },
    ] as never);
    vi.mocked(prisma.fboHangarOverride.findUnique).mockResolvedValue(null as never);

    const map = await loadAircraftReferenceDefaults({
      aircraftTypeId: "wa-1",
      airportIcao: "KSDL",
      fboName: "PrismJet",
    });

    expect(map.home_fuel_price).toBe("6.25");
    expect(map.fuel_source).toBe("fbo_base");
    expect(map.hangar_annual).toBe("22320");
  });

  it("returns an empty map when the aircraft is missing", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(null as never);

    const map = await loadAircraftReferenceDefaults({ aircraftTypeId: "missing" });

    expect(map).toEqual({});
  });
});
