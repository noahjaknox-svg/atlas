import { describe, expect, it } from "vitest";
import {
  resolveCrewTrainingTotal,
  formatTrainingCalculationHint,
} from "@/lib/aircraft-calculated-fields";
import {
  resolveHangarAnnual,
  resolveHangarPricingMode,
} from "@/lib/hangar-assumptions";
import { calculateProForma } from "@/lib/proforma";

describe("resolveCrewTrainingTotal", () => {
  it("multiplies per-pilot training by PIC and SIC headcount", () => {
    const result = resolveCrewTrainingTotal({
      pic_training: "10000",
      sic_training: "8000",
      pic_count: "2",
      sic_count: "1",
    });
    expect(result.pic).toBe(20000);
    expect(result.sic).toBe(8000);
    expect(result.total).toBe(28000);
  });

  it("formats calculation hints for workspace footers", () => {
    const a = {
      pic_training: "10000",
      sic_training: "8000",
      pic_count: "2",
      sic_count: "1",
    };
    expect(formatTrainingCalculationHint(a, "pic")).toBe("$10,000 × 2 PIC = $20,000");
    expect(formatTrainingCalculationHint(a, "sic")).toBe("$8,000 × 1 SIC = $8,000");
    expect(formatTrainingCalculationHint(a, "total")).toBe(
      "$10,000 × 2 PIC + $8,000 × 1 SIC"
    );
  });
});

describe("resolveHangarAnnual", () => {
  it("uses monthly × 12 in monthly mode", () => {
    expect(
      resolveHangarAnnual({
        hangar_pricing_mode: "monthly",
        hangar_monthly: "5000",
      })
    ).toBe(60000);
  });

  it("uses annual total in annual mode", () => {
    expect(
      resolveHangarAnnual({
        hangar_pricing_mode: "annual",
        hangar_annual: "72000",
      })
    ).toBe(72000);
  });

  it("defaults to monthly mode", () => {
    expect(resolveHangarPricingMode(undefined)).toBe("monthly");
  });
});

describe("fuel surcharge hours", () => {
  it("applies fuel surcharge to flight hours, not block hours", () => {
    const result = calculateProForma({
      fuelBurnGph: 180,
      homeFuelPrice: 5.25,
      awayFuelPrice: 6.75,
      homeFuelPct: 65,
      engineProgramRate: 0,
      apuProgramRate: 0,
      partsProgramRate: 0,
      inspectionReserveRate: 0,
      maintenanceReserveRate: 0,
      tripExpensePerHour: 0,
      totalFixedCosts: 0,
      charterRate: 5500,
      charterRevenueHours: 350,
      availableCharterFlightHours: 320,
      charterBlockHours: 350,
      charterFlightHours: 320,
      charterPaybackPct: 100,
      fuelSurcharge: 100,
      fuelSurchargeFlightHours: 320,
      ownerFlightHours: 0,
    });

    const surchargeLine = result.lineItems.find((l) => l.key === "fuel_surcharge");
    expect(surchargeLine?.annual).toBe(32000);
  });
});
