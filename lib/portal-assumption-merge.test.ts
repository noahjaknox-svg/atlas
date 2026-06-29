import { describe, expect, it } from "vitest";
import { mergeAssumptionRowsForEntry } from "@/lib/portal-assumption-merge";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

const entry: AircraftSnapshotEntry = {
  id: "a1",
  label: "N123",
  aircraftProfileMode: "existing",
  aircraftTypeLabel: "G550",
  portalSubtitle: null,
  manufacturer: "Gulfstream",
  model: "G550",
  tailNumber: "N123",
  year: 2018,
  category: null,
  proposedHomeBase: "KTEB",
  clientSummary: null,
  portalImageUrl: null,
  portalVideoUrl: null,
  portalSpecHighlights: [],
  assumptions: {},
  calculationAssumptions: {},
  metrics: {
    netAnnualCost: 0,
    netMonthlyCost: 0,
    ownerHours: 400,
    charterRevenueOffset: 0,
    costPerOwnerHour: 0,
    aircraftValue: 0,
  },
  proForma: {
    netAnnualCost: 0,
    netMonthlyCost: 0,
    totalRevenue: 0,
    totalFixedCosts: 0,
    ownerVariableCost: 0,
    charterVariableCost: 0,
    costPerOwnerHour: 0,
    charterRevenueOffset: 0,
    rows: [],
  },
};

describe("mergeAssumptionRowsForEntry", () => {
  it("prefers per-aircraft rows over legacy categories", () => {
    const rows = [
      { category: "ac_a1", assumptionName: "aircraft_value", value: "9000000" },
      { category: "aircraft", assumptionName: "aircraft_value", value: "0" },
    ];
    const merged = mergeAssumptionRowsForEntry(rows, entry, "a1");
    expect(merged.aircraft_value).toBe("9000000");
  });

  it("does not overlay legacy when other ac_* rows exist", () => {
    const rows = [
      { category: "ac_a2", assumptionName: "owner_annual_hours", value: "300" },
      { category: "aircraft", assumptionName: "aircraft_value", value: "18000000" },
    ];
    const merged = mergeAssumptionRowsForEntry(rows, entry, "a1");
    expect(merged.aircraft_value).toBeUndefined();
  });
});
