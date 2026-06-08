import { describe, expect, it } from "vitest";
import { buildAircraftSnapshotEntry, buildAircraftSnapshotList } from "@/lib/snapshot-aircraft";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

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
    aircraftMasterId: null,
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
    aircraftMaster: {
      id: "m1",
      manufacturer: id === "a1" ? "Gulfstream" : "Bombardier",
      model: id === "a1" ? "G550" : "Challenger 350",
      variant: null,
      aircraftCategory: "large_cabin_jet" as const,
      typicalCrewRequired: 2,
      typicalFuelBurnGph: null,
      typicalCruiseSpeedKtas: null,
      typicalRangeNm: null,
      typicalPassengerCapacity: null,
      typicalCharterRate: null,
      maxRecommendedUtilization: null,
      cabinSqft: null,
      typicalHullValue: null,
      defaultEngineModel: null,
      defaultApuModel: null,
      dataConfidence: "medium" as const,
      sourceNotes: null,
      externalId: null,
      externalSource: null,
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
  it("returns empty list when no aircraft included", () => {
    expect(
      buildAircraftSnapshotList({
        includedAircraft: [],
        primaryAircraftInstanceId: null,
        assumptionRows: [],
        allAssumptions: [],
        prospectOpportunityType: "aircraft_management",
      })
    ).toEqual([]);
  });

  it("builds one entry for a single included aircraft", () => {
    const list = buildAircraftSnapshotList({
      includedAircraft: [mockAircraft("a1", "N123AB")],
      primaryAircraftInstanceId: "a1",
      assumptionRows: baseAssumptionRows.filter((r) => r.category === "ac_a1"),
      allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
      prospectOpportunityType: "aircraft_management",
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("a1");
    expect(list[0]?.label).toContain("Gulfstream");
    expect(list[0]?.portalImageUrl).toContain("a1");
    expect(list[0]?.portalSpecHighlights).toEqual(["8 pax", "3,200 nm"]);
    expect(list[0]?.metrics.ownerHours).toBe(250);
  });

  it("builds separate entries for multiple aircraft", () => {
    const list = buildAircraftSnapshotList({
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
  it("synthesizes legacy single-aircraft snapshot", () => {
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
      proForma: buildAircraftSnapshotEntry({
        aircraft: mockAircraft("a1", "N99"),
        assumptionRows: baseAssumptionRows.filter((r) => r.category === "ac_a1"),
        allAssumptions: visibleAssumptions.filter((a) => a.category === "ac_a1"),
        prospectOpportunityType: "aircraft_management",
        isPrimaryLegacy: true,
      }).proForma,
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
    expect(list[0]?.label).toContain("Gulfstream");
  });
});
