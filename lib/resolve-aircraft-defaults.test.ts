import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    aircraftType: { findUnique: vi.fn() },
    aircraftInstance: { findUnique: vi.fn() },
    fboHangarOverride: { findUnique: vi.fn() },
    usageType: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/company-settings", () => ({
  getCompanySettings: vi.fn(),
}));

vi.mock("@/lib/fbo-airport-lookup", () => ({
  findFbosAtAirport: vi.fn(),
}));

vi.mock("@/lib/resolve-warehouse-aircraft-id", () => ({
  resolveValidAircraftTypeId: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";
import { resolveValidAircraftTypeId } from "@/lib/resolve-warehouse-aircraft-id";
import { resolveAircraftDefaults } from "@/lib/resolve-aircraft-defaults";

const CHALLENGER = {
  id: "wa-ch300",
  displayName: "Bombardier Challenger 300",
  status: "published",
  proformaFieldVisibility: null,
  manufacturer: "Bombardier",
  model: "Challenger 300",
  modelCode: "CL30",
  passengerCapacity: 8,
  emptyRange: 3200,
  rangeAtMaxPassengers: 2800,
  crewCount: 2,
  squareFootage: 930,
  averageCruiseSpeed: 459,
  wifi: true,
  homeFuelPct: 70,
  fuelGallonsPerHour: 266,
  partsProgram: 495,
  engineProgram: 1150,
  apuProgram: 90,
  inspectionReserve: 75,
  tripExpenseHourly: 250,
  defaultMinimumCrew: 3,
  leadPilotSalary: 240000,
  leadPilotTrainingCost: 15666,
  picSalary: 200000,
  sicSalary: 150000,
  cabinAttendantSalary: null,
  picTrainingCost: 15666,
  sicTrainingCost: 15667,
  maxUsage1Pilot: 200,
  maxUsage2Pilots: 450,
  maxUsage3Pilots: 600,
  maxUsage4Pilots: 700,
  maxUsage5Pilots: 800,
  maxUsage6Pilots: 900,
  averageCost: 8500000,
  charterHourlyRate: 6000,
  charterPaybackBasis: "block_hours",
  fuelSurchargePaybackBasis: "flight_hours",
  fuelSurcharge: 600,
  pilotCharterIncentive: 113,
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe("resolveAircraftDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompanySettings).mockResolvedValue(SETTINGS as never);
    vi.mocked(findFbosAtAirport).mockResolvedValue([]);
    vi.mocked(resolveValidAircraftTypeId).mockResolvedValue({
      id: CHALLENGER.id,
      source: "instance",
    } as never);
    vi.mocked(prisma.aircraftInstance.findUnique).mockResolvedValue({
      id: "inst-1",
      aircraftTypeId: CHALLENGER.id,
      proposedHomeBaseIcao: null,
      fboName: null,
      aircraftType: CHALLENGER,
      proposal: { prospect: { opportunityType: "aircraft_management" } },
    } as never);
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(CHALLENGER as never);
    vi.mocked(prisma.usageType.findFirst).mockResolvedValue(null as never);
  });

  it("does not inject aircraft_year for Challenger 300 in general profile mode", async () => {
    const defaults = await resolveAircraftDefaults({
      aircraftInstanceId: "inst-1",
      assumptions: {
        aircraft_profile_mode: "general",
        aircraft_manufacturer: "Bombardier",
        aircraft_model: "Challenger 300",
      },
    });

    expect(defaults.aircraft_year).toBeUndefined();
    expect(defaults).not.toHaveProperty("aircraft_year");
    expect(defaults.aircraft_manufacturer).toBe("Bombardier");
    expect(defaults.aircraft_model).toBe("Challenger 300");
    expect(defaults.typical_range).toBe("3200");
    expect(defaults.default_minimum_crew).toBe("3");
  });

  it("omits optional warehouse fields when null", async () => {
    const sparse = {
      ...CHALLENGER,
      emptyRange: null,
      averageCruiseSpeed: null,
      wifi: null,
      cabinAttendantSalary: null,
    };
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(sparse as never);
    // The instance's joined aircraftType row is reused instead of re-queried.
    vi.mocked(prisma.aircraftInstance.findUnique).mockResolvedValue({
      id: "inst-1",
      aircraftTypeId: CHALLENGER.id,
      proposedHomeBaseIcao: null,
      fboName: null,
      aircraftType: sparse,
    } as never);

    const defaults = await resolveAircraftDefaults({
      aircraftInstanceId: "inst-1",
      assumptions: { aircraft_profile_mode: "general" },
    });

    expect(defaults.typical_range).toBeUndefined();
    expect(defaults.typical_cruise_speed).toBeUndefined();
    expect(defaults.wifi_features).toBeUndefined();
    expect(defaults.cabin_attendant_annual_cost).toBeUndefined();
  });
});
