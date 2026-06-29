import { describe, expect, it, vi } from "vitest";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import {
  customFixedCostLineKey,
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";

vi.mock("@/lib/portal-calculation-assumptions", () => ({
  resolvePortalCalculationMap: vi.fn(async () => ({
    charter_rate: "9999",
    owner_annual_hours: "500",
    aircraft_value: "42000000",
    usage_type: "part_91",
    max_usage_1_pilot: "0",
    max_usage_2_pilots: "450",
    max_usage_3_pilots: "600",
    crew_step_index: "0",
    lead_pilot_enabled: "no",
    pic_count: "1",
    sic_count: "1",
    crew_total: "400000",
    subscriptions_annual: "12000",
    home_fuel_price: "6",
    away_fuel_price: "7",
    home_fuel_pct: "80",
    fuel_burn_gph: "400",
    max_annual_utilization: "450",
    charter_block_to_flight_ratio: "1.13",
    variable_cost_per_hour: "1200",
    insurance_mode: "fixed",
    insurance_annual: "50000",
    [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ subscriptions_pl: false }),
  })),
}));

vi.mock("@/lib/proposal-owners-db", () => ({
  loadOwnerProfilesForAircraft: vi.fn(async () => ({
    profiles: [{ sortOrder: 0, displayName: "Live Owner", annualFlightHours: 999, ownershipPercent: 100 }],
  })),
}));

import { resolvePortalCalculationMap } from "@/lib/portal-calculation-assumptions";
import { loadOwnerProfilesForAircraft } from "@/lib/proposal-owners-db";
import { serializeClientSnapshot } from "@/lib/client-serializer";

const baseSnapshot: ProposalSnapshotPayload = {
  version: 1,
  renderSchemaVersion: 1,
  publishedAt: new Date().toISOString(),
  proposal: {
    id: "p1",
    name: "Test",
    status: "published",
    preparedDate: null,
    clientSummary: null,
  },
  prospect: {
    name: "Acme",
    companyName: null,
    contactName: "Pat",
    contactEmail: "pat@example.com",
  },
  aircraft: {
    manufacturer: "Gulfstream",
    model: "G550",
    tailNumber: "N123",
    year: 2018,
    category: null,
    proposedHomeBase: "KTEB",
    clientSummary: null,
  },
  assumptions: {},
  sections: [],
  proForma: {
    netAnnualCost: 1000000,
    netMonthlyCost: 83333,
    totalRevenue: 0,
    totalFixedCosts: 500000,
    ownerVariableCost: 100000,
    charterVariableCost: 50000,
    costPerOwnerHour: 2500,
    charterRevenueOffset: 0,
    rows: [],
  },
  metrics: {
    netAnnualCost: 1000000,
    netMonthlyCost: 83333,
    ownerHours: 400,
    charterRevenueOffset: 0,
    costPerOwnerHour: 2500,
    aircraftValue: 30000000,
  },
  aircraftList: [
    {
      id: "a1",
      label: "N123",
      aircraftProfileMode: "existing",
      aircraftTypeLabel: "Gulfstream G550",
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
      calculationAssumptions: {
        charter_rate: "5500",
        owner_annual_hours: "400",
      },
      ownerProfiles: [
        {
          sortOrder: 0,
          displayName: "Owner",
          annualFlightHours: 400,
          ownershipPercent: 100,
        },
      ],
      metrics: {
        netAnnualCost: 1000000,
        netMonthlyCost: 83333,
        ownerHours: 400,
        charterRevenueOffset: 0,
        costPerOwnerHour: 2500,
        aircraftValue: 30000000,
      },
      proForma: {
        netAnnualCost: 1000000,
        netMonthlyCost: 83333,
        totalRevenue: 0,
        totalFixedCosts: 500000,
        ownerVariableCost: 100000,
        charterVariableCost: 50000,
        costPerOwnerHour: 2500,
        charterRevenueOffset: 0,
        rows: [],
      },
    },
  ],
};

describe("serializeClientSnapshot frozen published path", () => {
  it("does not call live workspace resolver for published portals", async () => {
    await serializeClientSnapshot(baseSnapshot, { proposalId: "p1" });
    expect(resolvePortalCalculationMap).not.toHaveBeenCalled();
    expect(loadOwnerProfilesForAircraft).not.toHaveBeenCalled();
  });

  it("uses snapshot calculationAssumptions for published portals", async () => {
    const view = await serializeClientSnapshot(baseSnapshot, { proposalId: "p1" });
    expect(view.calculationAssumptions.charter_rate).toBe("5500");
    expect(view.ownerProfiles[0]?.displayName).toBe("Owner");
  });

  it("calls live resolver for draft preview", async () => {
    vi.mocked(resolvePortalCalculationMap).mockClear();
    await serializeClientSnapshot(baseSnapshot, {
      proposalId: "p1",
      useLiveWorkspace: true,
    });
    expect(resolvePortalCalculationMap).toHaveBeenCalled();
  });

  it("prefers live calculation map for draft preview", async () => {
    const view = await serializeClientSnapshot(baseSnapshot, {
      proposalId: "p1",
      useLiveWorkspace: true,
    });
    expect(view.calculationAssumptions.charter_rate).toBe("9999");
    expect(view.calculationAssumptions.aircraft_value).toBe("42000000");
    expect(view.editableFields.aircraftValue.value).toBe(42_000_000);
  });

  it("hides pro forma lines per live workspace visibility on draft preview", async () => {
    const view = await serializeClientSnapshot(baseSnapshot, {
      proposalId: "p1",
      useLiveWorkspace: true,
    });
    expect(view.calculationAssumptions[PROFORMA_VISIBILITY_KEY]).toContain("subscriptions_pl");
    expect(view.statementRows.some((r) => r.key === "subscriptions_pl")).toBe(false);
  });

  it("shows custom fixed cost lines from live workspace on draft preview", async () => {
    const customJson = serializeProformaCustomFixedCosts([
      { id: "test2", name: "Test 2", amount: 90000 },
    ]);
    vi.mocked(resolvePortalCalculationMap).mockResolvedValueOnce({
      usage_type: "part_91",
      owner_annual_hours: "400",
      crew_total: "300000",
      management_fee: "50000",
      max_usage_1_pilot: "0",
      max_usage_2_pilots: "450",
      max_usage_3_pilots: "600",
      crew_step_index: "0",
      lead_pilot_enabled: "no",
      pic_count: "1",
      sic_count: "1",
      home_fuel_price: "6",
      away_fuel_price: "7",
      home_fuel_pct: "80",
      fuel_burn_gph: "400",
      max_annual_utilization: "450",
      charter_block_to_flight_ratio: "1.13",
      variable_cost_per_hour: "1200",
      insurance_mode: "fixed",
      insurance_annual: "50000",
      aircraft_value: "9000000",
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: customJson,
    });

    const view = await serializeClientSnapshot(baseSnapshot, {
      proposalId: "p1",
      useLiveWorkspace: true,
    });

    const customRow = view.statementRows.find(
      (r) => r.key === customFixedCostLineKey("test2")
    );
    expect(customRow?.label).toBe("Test 2");
    expect(customRow?.annual).toBe(-90000);
    expect(view.calculationAssumptions[PROFORMA_CUSTOM_FIXED_COSTS_KEY]).toBe(customJson);
  });

  it("hides pro forma lines from frozen snapshot calculationAssumptions", async () => {
    const visibility = JSON.stringify({ subscriptions_pl: false });
    const snapshot: ProposalSnapshotPayload = {
      ...baseSnapshot,
      aircraftList: [
        {
          ...baseSnapshot.aircraftList![0]!,
          calculationAssumptions: {
            ...baseSnapshot.aircraftList![0]!.calculationAssumptions!,
            usage_type: "part_91",
            max_usage_1_pilot: "0",
            max_usage_2_pilots: "450",
            max_usage_3_pilots: "600",
            crew_step_index: "0",
            lead_pilot_enabled: "no",
            pic_count: "1",
            sic_count: "1",
            crew_total: "400000",
            subscriptions_annual: "12000",
            home_fuel_price: "6",
            away_fuel_price: "7",
            home_fuel_pct: "80",
            fuel_burn_gph: "400",
            max_annual_utilization: "450",
            charter_block_to_flight_ratio: "1.13",
            variable_cost_per_hour: "1200",
            insurance_mode: "fixed",
            insurance_annual: "50000",
            aircraft_value: "30000000",
            [PROFORMA_VISIBILITY_KEY]: visibility,
          },
        },
      ],
    };

    const view = await serializeClientSnapshot(snapshot, { proposalId: "p1" });
    expect(view.calculationAssumptions[PROFORMA_VISIBILITY_KEY]).toBe(visibility);
    expect(view.statementRows.some((r) => r.key === "subscriptions_pl")).toBe(false);
  });
});
