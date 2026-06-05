import { describe, expect, it } from "vitest";
import {
  computeJetFuelTaxDifferentialCredit,
  jetFuelTaxCreditPerHour,
  JET_FUEL_TAX_DIFFERENTIAL_KEY,
} from "@/lib/fet-refund";

const fuel = {
  charterFlightHours: 100,
  fuelBurnGph: 180,
};

const assumptions = {
  [JET_FUEL_TAX_DIFFERENTIAL_KEY]: "0.175",
  fet_treatment: "pass_through",
};

describe("jetFuelTaxCreditPerHour", () => {
  it("multiplies GPH by configurable differential per gallon", () => {
    expect(jetFuelTaxCreditPerHour(assumptions, 180)).toBeCloseTo(180 * 0.175);
  });
});

describe("computeJetFuelTaxDifferentialCredit", () => {
  it("equals hourly refund × charter flight hours", () => {
    const hourly = jetFuelTaxCreditPerHour(assumptions, fuel.fuelBurnGph);
    const annual = computeJetFuelTaxDifferentialCredit(assumptions, fuel);
    expect(annual).toBeCloseTo(hourly * fuel.charterFlightHours);
    expect(annual).toBeCloseTo(180 * 100 * 0.175);
  });
});
