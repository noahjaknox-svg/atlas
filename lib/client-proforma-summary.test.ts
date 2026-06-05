import { describe, expect, it } from "vitest";
import { buildClientProFormaSummary } from "@/lib/client-proforma-summary";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

const entry: AircraftSnapshotEntry = {
  id: "ac-1",
  label: "Gulfstream G550",
  manufacturer: "Gulfstream",
  model: "G550",
  tailNumber: "N123AB",
  year: 2018,
  category: "large_cabin_jet",
  proposedHomeBase: "SDL",
  clientSummary: null,
  portalImageUrl: null,
  portalVideoUrl: null,
  portalSpecHighlights: [],
  assumptions: {
    aircraft_value: {
      value: "25000000",
      unit: null,
      visibleToClient: true,
      editableByClient: true,
      clientExplanation: null,
      category: "ac_ac-1",
    },
    owner_annual_hours: {
      value: "250",
      unit: null,
      visibleToClient: true,
      editableByClient: true,
      clientExplanation: null,
      category: "ac_ac-1",
    },
    usage_type: {
      value: "part_91",
      unit: null,
      visibleToClient: true,
      editableByClient: false,
      clientExplanation: null,
      category: "ac_ac-1",
    },
    home_fuel_price: { value: "6", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    away_fuel_price: { value: "7", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    home_fuel_pct: { value: "80", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    fuel_burn_gph: { value: "400", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    max_annual_utilization: { value: "500", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    charter_block_to_flight_ratio: { value: "1.13", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    variable_cost_per_hour: { value: "1200", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
    crew_total: { value: "500000", unit: null, visibleToClient: true, editableByClient: false, clientExplanation: null, category: "ac_ac-1" },
  },
  calculationAssumptions: {
    aircraft_value: "25000000",
    owner_annual_hours: "250",
    usage_type: "part_91",
    home_fuel_price: "6",
    away_fuel_price: "7",
    home_fuel_pct: "80",
    fuel_burn_gph: "400",
    max_annual_utilization: "500",
    charter_block_to_flight_ratio: "1.13",
    variable_cost_per_hour: "1200",
    crew_total: "500000",
  },
  metrics: {
    netAnnualCost: 1_200_000,
    netMonthlyCost: 100_000,
    ownerHours: 250,
    charterRevenueOffset: 0,
    costPerOwnerHour: 4800,
    aircraftValue: 25_000_000,
  },
  proForma: {
    blendedFuelPrice: 6.2,
    fuelCostPerHour: 2480,
    variableCostPerHour: 3680,
    charterRevenue: 0,
    fuelSurchargeRevenue: 0,
    totalRevenue: 0,
    charterVariableCost: 0,
    ownerVariableCost: 920_000,
    netBeforeOwner: -500_000,
    netAnnualCost: 1_200_000,
    netMonthlyCost: 100_000,
    costPerOwnerHour: 4800,
    insuranceEstimate: 0,
    lineItems: [
      { key: "owner_variable", label: "Owner variable", category: "variable", annual: 920_000, monthly: 76_667 },
      { key: "total_revenue", label: "Total revenue", category: "total", annual: 0, monthly: 0 },
    ],
  },
};

describe("buildClientProFormaSummary", () => {
  it("builds summary rows matching client pro forma shape", () => {
    const summary = buildClientProFormaSummary(entry);
    expect(summary.aircraftId).toBe("ac-1");
    expect(summary.summaryRows).toHaveLength(3);
    expect(summary.summaryRows[0]?.key).toBe("fixed");
    expect(
      summary.fixedCostBreakdown.some((i) => i.label === "Crew Salaries & Benefits")
    ).toBe(true);
    expect(Number.isFinite(summary.proForma.netAnnualCost)).toBe(true);
    expect(summary.summaryRows[0]?.annual).toBe(500_000);
    expect(summary.statementRows.length).toBeGreaterThan(5);
    expect(
      summary.statementRows.some(
        (r) => r.kind === "line" && r.label === "Crew Salaries & Benefits"
      )
    ).toBe(true);
    expect(summary.statementRows.some((r) => r.key === "net_annual_owner")).toBe(true);
  });
});
