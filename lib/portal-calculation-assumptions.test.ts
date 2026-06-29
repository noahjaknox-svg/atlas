import { describe, expect, it } from "vitest";
import { mergeAssumptionRowsForEntry } from "@/lib/portal-assumption-merge";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

function entry(id: string): AircraftSnapshotEntry {
  return {
    id,
    label: id,
    aircraftProfileMode: "existing",
    aircraftTypeLabel: null,
    portalSubtitle: null,
    manufacturer: null,
    model: null,
    tailNumber: null,
    year: null,
    category: null,
    proposedHomeBase: null,
    clientSummary: null,
    portalImageUrl: null,
    portalVideoUrl: null,
    portalSpecHighlights: [],
    assumptions: {},
    metrics: {
      netAnnualCost: 0,
      netMonthlyCost: 0,
      ownerHours: 0,
      charterRevenueOffset: 0,
      costPerOwnerHour: 0,
      aircraftValue: 0,
    },
    proForma: {
      blendedFuelPrice: 0,
      fuelCostPerHour: 0,
      variableCostPerHour: 0,
      charterRevenue: 0,
      fuelSurchargeRevenue: 0,
      totalRevenue: 0,
      charterVariableCost: 0,
      ownerVariableCost: 0,
      netBeforeOwner: 0,
      netAnnualCost: 0,
      netMonthlyCost: 0,
      costPerOwnerHour: 0,
      insuranceEstimate: 0,
      lineItems: [],
    },
  };
}

describe("mergeAssumptionRowsForEntry", () => {
  it("uses per-aircraft rows without legacy overwrite", () => {
    const rows = [
      { category: "ac_a1", assumptionName: "owner_annual_hours", value: "400" },
      { category: "aircraft", assumptionName: "aircraft_value", value: "0" },
    ];

    const merged = mergeAssumptionRowsForEntry(rows, entry("a1"), "a1");

    expect(merged.owner_annual_hours).toBe("400");
    expect(merged.aircraft_value).toBeUndefined();
  });

  it("falls back to legacy rows when aircraft category is empty", () => {
    const rows = [
      { category: "aircraft", assumptionName: "aircraft_value", value: "18000000" },
      { category: "aircraft", assumptionName: "owner_annual_hours", value: "250" },
    ];

    const merged = mergeAssumptionRowsForEntry(rows, entry("a1"), "a1");

    expect(merged.aircraft_value).toBe("18000000");
    expect(merged.owner_annual_hours).toBe("250");
  });
});
