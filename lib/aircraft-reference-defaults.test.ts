import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    aircraftMaster: { findUnique: vi.fn() },
    crewRate: { findMany: vi.fn() },
    trainingCost: { findMany: vi.fn() },
    programCost: { findMany: vi.fn() },
    insuranceAssumption: { findFirst: vi.fn() },
    aircraftOperatingDefault: { findMany: vi.fn() },
    charterMarketRate: { findFirst: vi.fn() },
    airport: { findUnique: vi.fn() },
    stateCostFactor: { findUnique: vi.fn() },
    hangarCost: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";

describe("loadAircraftReferenceDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps crew, programs, and operating defaults from DB", async () => {
    vi.mocked(prisma.aircraftMaster.findUnique).mockResolvedValue({
      id: "master-1",
      typicalFuelBurnGph: { toString: () => "300" } as never,
      typicalCharterRate: { toString: () => "6000" } as never,
      maxRecommendedUtilization: 450,
      typicalHullValue: { toString: () => "11000000" } as never,
      cabinSqft: 4550,
      typicalPassengerCapacity: null,
      typicalRangeNm: null,
      typicalCruiseSpeedKtas: null,
      aircraftCategory: "super_midsize_jet",
    } as never);

    vi.mocked(prisma.crewRate.findMany).mockResolvedValue([
      {
        role: "pic",
        salaryBase: { toString: () => "240000" } as never,
        benefitsPercent: { toString: () => "16" } as never,
      },
      {
        role: "sic",
        salaryBase: { toString: () => "150000" } as never,
        benefitsPercent: null,
      },
    ] as never);

    vi.mocked(prisma.trainingCost.findMany).mockResolvedValue([
      { role: "pic", annualCost: { toString: () => "15666" } as never },
      { role: "sic", annualCost: { toString: () => "15667" } as never },
    ] as never);

    vi.mocked(prisma.programCost.findMany).mockResolvedValue([
      { programType: "engine", provider: null, hourlyRate: { toString: () => "1150" } as never },
      { programType: "parts", provider: null, hourlyRate: { toString: () => "495" } as never },
      { programType: "other", provider: "inspection_reserve", hourlyRate: { toString: () => "75" } as never },
      { programType: "other", provider: "trip_expense", hourlyRate: { toString: () => "250" } as never },
    ] as never);

    vi.mocked(prisma.insuranceAssumption.findFirst).mockResolvedValue({
      annualPremiumEstimate: { toString: () => "51000" } as never,
    } as never);

    vi.mocked(prisma.aircraftOperatingDefault.findMany).mockResolvedValue([
      { costKey: "wifi_annual", annualAmount: { toString: () => "50000" } as never },
      { costKey: "management_fee", annualAmount: { toString: () => "120000" } as never },
    ] as never);

    vi.mocked(prisma.charterMarketRate.findFirst).mockResolvedValue({
      retailRateBase: { toString: () => "6000" } as never,
      fuelSurcharge: { toString: () => "600" } as never,
      ownerPaybackPercent: { toString: () => "75" } as never,
    } as never);

    vi.mocked(prisma.airport.findUnique).mockResolvedValue(null);

    const map = await loadAircraftReferenceDefaults({ aircraftMasterId: "master-1" });

    expect(map.pic_salary).toBe("240000");
    expect(map.sic_salary).toBe("150000");
    expect(map.engine_program_rate).toBe("1150");
    expect(map.inspection_reserve_rate).toBe("75");
    expect(map.trip_expense_per_hour).toBe("250");
    expect(map.wifi_annual).toBe("50000");
    expect(map.insurance_annual).toBe("51000");
    expect(map.aircraft_value).toBe("11000000");
  });
});
