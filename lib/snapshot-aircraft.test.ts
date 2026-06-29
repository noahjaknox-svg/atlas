import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/resolve-aircraft-defaults", () => ({
  resolveAircraftDefaults: vi.fn(async () => ({})),
  resolveEffectiveAssumptionsForInstance: vi.fn(
    async (_id: string, assumptions: Record<string, string>) => assumptions
  ),
}));

vi.mock("@/lib/proposal-owners-db", () => ({
  loadOwnerProfilesForAircraft: vi.fn(async () => ({
    profiles: [],
    allocationMode: "hybrid",
  })),
}));

import type { ProposalScenario } from "@prisma/client";
import { buildAircraftSnapshotEntry, buildAircraftSnapshotList } from "@/lib/snapshot-aircraft";
import { loadOwnerProfilesForAircraft } from "@/lib/proposal-owners-db";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import { buildClientProFormaSummary } from "@/lib/client-proforma-summary";
import {
  customFixedCostLineKey,
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";

const baseAssumptionRows = [
  { category: "ac_a1", assumptionName: "aircraft_manufacturer", value: "Gulfstream" },
  { category: "ac_a1", assumptionName: "aircraft_model", value: "G550" },
  { category: "ac_a1", assumptionName: "aircraft_value", value: "25000000" },
  { category: "ac_a1", assumptionName: "owner_annual_hours", value: "250" },
  { category: "ac_a1", assumptionName: "usage_type", value: "part_91" },
  { category: "ac_a1", assumptionName: "home_fuel_price", value: "6" },
  { category: "ac_a1", assumptionName: "away_fuel_price", value: "7" },
  { category: "ac_a1", assumptionName: "home_fuel_pct", value: "80" },
  { category: "ac_a1", assumptionName: "fuel_burn_gph", value: "400" },
  { category: "ac_a1", assumptionName: "max_annual_utilization", value: "500" },
  { category: "ac_a1", assumptionName: "charter_block_to_flight_ratio", value: "1.13" },
  { category: "ac_a1", assumptionName: "variable_cost_per_hour", value: "1200" },
  { category: "ac_a2", assumptionName: "aircraft_manufacturer", value: "Bombardier" },
  { category: "ac_a2", assumptionName: "aircraft_model", value: "Challenger 350" },
  { category: "ac_a2", assumptionName: "aircraft_value", value: "12000000" },
  { category: "ac_a2", assumptionName: "owner_annual_hours", value: "150" },
  { category: "ac_a2", assumptionName: "usage_type", value: "part_91" },
  { category: "ac_a2", assumptionName: "home_fuel_price", value: "6" },
  { category: "ac_a2", assumptionName: "away_fuel_price", value: "7" },
  { category: "ac_a2", assumptionName: "home_fuel_pct", value: "80" },
  { category: "ac_a2", assumptionName: "fuel_burn_gph", value: "250" },
  { category: "ac_a2", assumptionName: "max_annual_utilization", value: "400" },
  { category: "ac_a2", assumptionName: "charter_block_to_flight_ratio", value: "1.13" },
  { category: "ac_a2", assumptionName: "variable_cost_per_hour", value: "900" },
];

function mockAircraft(id: string, tail: string) {
  return {
    id,
    warehouseAircraftId: null,
    prospectId: "p1",
    proposalId: "prop1",
    tailNumber: tail,
    serialNumber: null,
    year: 2018,
    estimatedValue: null,
    valueSource: null,
    currentManager: null,
    currentOperator: null,
    currentHomeBaseIcao: null,
    proposedHomeBaseIcao: "SDL",
    engineModel: null,
    apuModel: null,
    wifiSystem: null,
    maintenanceTrackingProvider: null,
    programStatus: null,
    interiorCondition: null,
    paintCondition: null,
    knownInspections: null,
    deferredMaintenance: null,
    internalNotes: null,
    clientSummary: `Summary for ${tail}`,
    portalImageUrl: `https://example.com/${id}.jpg`,
    portalVideoUrl: null,
    portalSpecHighlights: ["8 pax", "3,200 nm"],
    includedOnProposal: true,
    fboName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    warehouseAircraft: {
      id: "m1",
      status: "published" as const,
      proformaFieldVisibility: null,
      displayName: id === "a1" ? "G550" : "Challenger 350",
      manufacturer: id === "a1" ? "Gulfstream" : "Bombardier",
      model: id === "a1" ? "G550" : "Challenger 350",
      modelCode: id === "a1" ? "G550" : "CL35",
      aircraftCategory: "large_cabin_jet" as const,
      passengerCapacity: 8,
      emptyRange: 6000,
      rangeAtMaxPassengers: 5000,
      crewCount: 2,
      squareFootage: 930,
      averageCruiseSpeed: 480,
      wifi: true,
      homeFuelPct: 70,
      fuelGallonsPerHour: 400,
      partsProgram: null,
      engineProgram: null,
      apuProgram: null,
      inspectionReserve: null,
      tripExpenseHourly: null,
      defaultMinimumCrew: 0,
      leadPilotSalary: 240000,
      leadPilotTrainingCost: 15666,
      picSalary: 240000,
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
      averageCost: null,
      charterHourlyRate: null,
      charterPaybackBasis: "block_time" as const,
      fuelSurchargePaybackBasis: "block_time" as const,
      fuelSurcharge: null,
      pilotCharterIncentive: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

const visibleAssumptions = baseAssumptionRows.map((row, i) => ({
  id: `ass-${i}`,
  proposalId: "prop1",
  category: row.category,
  assumptionName: row.assumptionName,
  value: row.value,
  unit: null,
  sourceType: "manual" as const,
  sourceId: null,
  confidence: "medium" as const,
  visibleToClient: true,
  editableByClient: false,
  internalNote: null,
  clientExplanation: null,
  aiGenerated: false,
  aiModel: null,
  aiConfidence: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

describe("buildAircraftSnapshotList", () => {
  it("returns empty list when no aircraft included", async () => {
    await expect(
      buildAircraftSnapshotList({
        includedAircraft: [],
        primaryAircraftInstanceId: null,
        assumptionRows: [],
        allAssumptions: [],
        prospectOpportunityType: "aircraft_management",
      })
    ).resolves.toEqual([]);
  });

  it("builds one entry for a single included aircraft", async () => {
    const list = await buildAircraftSnapshotList({
      includedAircraft: [mockAircraft("a1", "N123AB")],
      primaryAircraftInstanceId: "a1",
      assumptionRows: baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("a1");
    expect(list[0]?.label).toContain("N123AB");
    expect(list[0]?.portalImageUrl).toContain("a1");
    expect(list[0]?.portalSpecHighlights).toEqual(["8 pax", "3,200 nm"]);
    expect(list[0]?.metrics.ownerHours).toBe(250);
    expect(list[0]?.calculationAssumptions.aircraft_value).toBe("25000000");
  });

  it("embeds proforma_line_visibility in calculationAssumptions and hides lines on portal", async () => {
    const visibility = JSON.stringify({ subscriptions_pl: false });
    const rows = [
      ...baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      { category: "ac_a1", assumptionName: "subscriptions_annual", value: "12000" },
      { category: "ac_a1", assumptionName: PROFORMA_VISIBILITY_KEY, value: visibility },
    ];

    const entry = await buildAircraftSnapshotEntry({
      proposalId: "prop1",
      aircraft: mockAircraft("a1", "N123AB"),
      assumptionRows: rows,
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
      isPrimaryLegacy: true,
    });

    expect(entry.calculationAssumptions?.[PROFORMA_VISIBILITY_KEY]).toBe(visibility);

    const summary = buildClientProFormaSummary(entry);
    expect(summary.statementRows.some((r) => r.key === "subscriptions_pl")).toBe(false);
  });

  it("embeds proforma_custom_fixed_costs in calculationAssumptions and portal statement", async () => {
    const customJson = serializeProformaCustomFixedCosts([
      { id: "legal", name: "Legal retainer", amount: 15000 },
    ]);
    const rows = [
      ...baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      { category: "ac_a1", assumptionName: PROFORMA_CUSTOM_FIXED_COSTS_KEY, value: customJson },
    ];

    const entry = await buildAircraftSnapshotEntry({
      proposalId: "prop1",
      aircraft: mockAircraft("a1", "N123AB"),
      assumptionRows: rows,
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
      isPrimaryLegacy: true,
    });

    expect(entry.calculationAssumptions?.[PROFORMA_CUSTOM_FIXED_COSTS_KEY]).toBe(customJson);

    const withoutCustom = await buildAircraftSnapshotEntry({
      proposalId: "prop1",
      aircraft: mockAircraft("a1", "N123AB"),
      assumptionRows: baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
      isPrimaryLegacy: true,
    });

    const summary = buildClientProFormaSummary(entry);
    const baseline = buildClientProFormaSummary(withoutCustom);
    const customRow = summary.statementRows.find(
      (r) => r.key === customFixedCostLineKey("legal")
    );
    expect(customRow?.label).toBe("Legal retainer");
    expect(customRow?.annual).toBe(-15000);

    const totalWith = summary.statementRows.find((r) => r.key === "total_fixed_ownership");
    const totalWithout = baseline.statementRows.find((r) => r.key === "total_fixed_ownership");
    expect(totalWith?.annual).toBe((totalWithout?.annual ?? 0) - 15000);
  });

  it("embeds remove financing mode and disables financing in calculationAssumptions", async () => {
    const rows = [
      ...baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      {
        category: "ac_a1",
        assumptionName: "financing_scenario_mode",
        value: "remove",
      },
      {
        category: "ac_a1",
        assumptionName: "financing_enabled",
        value: "yes",
      },
    ];
    const list = await buildAircraftSnapshotList({
      includedAircraft: [mockAircraft("a1", "N123AB")],
      primaryAircraftInstanceId: "a1",
      assumptionRows: rows,
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
    });
    expect(list[0]?.calculationAssumptions.financing_scenario_mode).toBe("remove");
    expect(list[0]?.calculationAssumptions.financing_enabled).toBe("no");
  });

  it("prefers assumption owner hours over stale base scenario row", async () => {
    vi.mocked(loadOwnerProfilesForAircraft).mockResolvedValueOnce({
      profiles: [
        {
          sortOrder: 0,
          displayName: "Owner",
          annualFlightHours: 150,
          ownershipPercent: 100,
        },
      ],
      allocationMode: "hybrid",
    });

    const rows = baseAssumptionRows.map((row) =>
      row.assumptionName === "owner_annual_hours" && row.category === "ac_a1"
        ? { ...row, value: "150" }
        : row
    );

    const entry = await buildAircraftSnapshotEntry({
      proposalId: "prop1",
      aircraft: mockAircraft("a1", "N123AB"),
      assumptionRows: rows.filter((r) => r.category === "ac_a1"),
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
      isPrimaryLegacy: true,
      scenario: {
        id: "sc1",
        proposalId: "prop1",
        aircraftInstanceId: "a1",
        scenarioName: "Scenario B (Base)",
        scenarioIndex: 1,
        isBaseCase: true,
        ownerHours: { toString: () => "125" } as ProposalScenario["ownerHours"],
        charterBlockHours: null,
        charterFlightHours: null,
        aircraftValue: null,
        crewStepIndex: null,
        leadPilotEnabled: null,
        totalFixedCosts: null,
        ownerVariableCosts: null,
        charterVariableCosts: null,
        totalRevenue: null,
        netAnnualCost: null,
        netMonthlyCost: null,
        costPerOwnerHour: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(entry.metrics.ownerHours).toBe(150);
    expect(entry.calculationAssumptions?.owner_annual_hours).toBe("150");
  });

  it("builds separate entries for multiple aircraft", async () => {
    const list = await buildAircraftSnapshotList({
      includedAircraft: [mockAircraft("a1", "N111"), mockAircraft("a2", "N222")],
      primaryAircraftInstanceId: "a1",
      assumptionRows: baseAssumptionRows,
      allAssumptions: visibleAssumptions,
      prospectOpportunityType: "aircraft_management",
    });
    expect(list).toHaveLength(2);
    expect(list[0]?.tailNumber).toBe("N111");
    expect(list[1]?.tailNumber).toBe("N222");
    expect(list[0]?.metrics.aircraftValue).toBe(25_000_000);
    expect(list[1]?.metrics.aircraftValue).toBe(12_000_000);
  });
});

describe("normalizeAircraftList", () => {
  it("synthesizes legacy single-aircraft snapshot", async () => {
    const entry = await buildAircraftSnapshotEntry({
      aircraft: mockAircraft("a1", "N99"),
      assumptionRows: baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
      isPrimaryLegacy: true,
    });
    const legacy = {
      version: 1,
      publishedAt: new Date().toISOString(),
      proposal: { id: "p", name: "Test", status: "published", preparedDate: null, clientSummary: null },
      prospect: { name: "Co", companyName: null, contactName: "Jane", contactEmail: "j@x.com" },
      aircraft: {
        manufacturer: "Gulfstream",
        model: "G550",
        tailNumber: "N99",
        year: 2020,
        category: "large_cabin_jet",
        proposedHomeBase: "SDL",
        clientSummary: "Legacy summary",
      },
      assumptions: {},
      sections: [],
      proForma: entry.proForma,
      metrics: {
        netAnnualCost: 1_000_000,
        netMonthlyCost: 83_333,
        ownerHours: 250,
        charterRevenueOffset: 0,
        costPerOwnerHour: 4000,
        aircraftValue: 25_000_000,
      },
    } satisfies ProposalSnapshotPayload;

    const list = normalizeAircraftList(legacy);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("legacy-primary");
    expect(list[0]?.label).toContain("N99");
  });
});
