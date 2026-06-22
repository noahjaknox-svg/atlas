import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    warehouseAircraft: { findUnique: vi.fn() },
    fbo: { findMany: vi.fn() },
    fboHangarOverride: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/company-settings", () => ({
  getCompanySettings: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";

const AIRCRAFT = {
  id: "wa-1",
  displayName: "Challenger 350",
  manufacturer: "Bombardier",
  model: "Challenger 350",
  modelCode: "CL35",
  squareFootage: 930,
  passengerCapacity: 9,
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
  cabinAttendantCount: 0,
  cabinAttendantSalary: 0,
  leadPilotCount: 1,
  leadPilotSalary: 240000,
  picCount: 0,
  picSalary: 240000,
  sicCount: 1,
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
    vi.mocked(prisma.fbo.findMany).mockResolvedValue([] as never);
  });

  it("maps hourly rates, finances, and company defaults", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(AIRCRAFT as never);

    const map = await loadAircraftReferenceDefaults({ warehouseAircraftId: "wa-1" });

    expect(map.engine_program_rate).toBe("1150");
    expect(map.home_fuel_pct).toBe("70");
    expect(map.inspection_reserve_rate).toBe("75");
    expect(map.trip_expense_per_hour).toBe("250");
    expect(map.aircraft_value).toBe("11000000");
    expect(map.management_fee).toBe("120000");
    expect(map.maintenance_management_fee).toBe("60000");
    expect(map.pic_salary).toBe("240000");
    expect(map.sic_salary).toBe("150000");
  });

  it("computes fully-loaded crew salary with benefits", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(AIRCRAFT as never);

    const map = await loadAircraftReferenceDefaults({ warehouseAircraftId: "wa-1" });

    // Warehouse baseline 0 PIC + 1 SIC (lead pilot is proposal-level, not folded in)
    // (0*240000 + 1*150000) * 1.16 = 174000
    expect(map.crew_total).toBe("174000");
    expect(map.pic_count).toBe("0");
    expect(map.sic_count).toBe("1");
    expect(map.lead_pilot_enabled).toBe("no");
  });

  it("keeps insurance and taxes zeroed until that tab exists", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(AIRCRAFT as never);

    const map = await loadAircraftReferenceDefaults({ warehouseAircraftId: "wa-1" });

    expect(map.insurance_annual).toBe("0");
    expect(map.registration_annual).toBe("0");
  });

  it("uses FBO base fuel rate and sqft-derived hangar when an FBO matches", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(AIRCRAFT as never);
    vi.mocked(prisma.fbo.findMany).mockResolvedValue([
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
      warehouseAircraftId: "wa-1",
      airportIcao: "KSDL",
      fboName: "PrismJet",
    });

    expect(map.home_fuel_price).toBe("6.25");
    expect(map.fuel_source).toBe("fbo_base");
    expect(map.square_footage).toBe("930");
    expect(map.hangar_cost_per_sqft).toBe("24");
    // 24 * 930 = 22320
    expect(map.hangar_annual).toBe("22320");
  });

  it("matches FBO rows when home base uses FAA LID instead of ICAO", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(AIRCRAFT as never);
    vi.mocked(prisma.fbo.findMany).mockResolvedValue([
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
      warehouseAircraftId: "wa-1",
      airportIcao: "SDL",
      fboName: "PrismJet",
    });

    expect(map.square_footage).toBe("930");
    expect(map.hangar_cost_per_sqft).toBe("24");
    expect(map.hangar_annual).toBe("22320");
  });

  it("returns an empty map when the aircraft is missing", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(null as never);

    const map = await loadAircraftReferenceDefaults({ warehouseAircraftId: "missing" });

    expect(map).toEqual({});
  });
});
