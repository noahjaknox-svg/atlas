import { describe, it, expect } from "vitest";
import {
  blendedFuelPrice,
  calculateProForma,
  fuelCostPerHour,
} from "./proforma";

describe("proforma engine", () => {
  it("calculates blended fuel price", () => {
    const result = blendedFuelPrice(5.5, 7.0, 70);
    expect(result).toBeCloseTo(5.5 * 0.7 + 7.0 * 0.3, 2);
  });

  it("calculates fuel cost per hour", () => {
    expect(fuelCostPerHour(200, 6)).toBe(1200);
  });

  it("calculates full pro forma outputs", () => {
    const result = calculateProForma({
      fuelBurnGph: 180,
      homeFuelPrice: 5.25,
      awayFuelPrice: 6.75,
      homeFuelPct: 65,
      engineProgramRate: 450,
      apuProgramRate: 35,
      partsProgramRate: 120,
      inspectionReserveRate: 80,
      maintenanceReserveRate: 200,
      tripExpensePerHour: 150,
      totalFixedCosts: 850000,
      charterRate: 5500,
      charterBlockHours: 350,
      charterFlightHours: 320,
      charterPaybackPct: 85,
      fuelSurcharge: 45,
      ownerFlightHours: 200,
      aircraftValue: 12000000,
      insurancePremiumPercent: 0.35,
      insuranceBasis: "hull_value",
    });

    expect(result.totalRevenue).toBeGreaterThan(0);
    expect(result.netAnnualCost).toBeDefined();
    expect(result.netMonthlyCost).toBeCloseTo(result.netAnnualCost / 12, 0);
    expect(result.costPerOwnerHour).toBeGreaterThan(0);
  });
});
