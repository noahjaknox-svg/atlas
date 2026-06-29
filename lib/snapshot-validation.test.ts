import { describe, expect, it } from "vitest";
import { validateAircraftSnapshotEntry, validateSnapshotPayload } from "@/lib/snapshot-validation";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

describe("validateSnapshotPayload", () => {
  it("requires aircraft_value and crew inputs on each aircraft entry", () => {
    const errors = validateAircraftSnapshotEntry({
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
      calculationAssumptions: {
        aircraft_value: "25000000",
        owner_annual_hours: "400",
        pic_count: "1",
        sic_count: "0",
      },
      metrics: {
        netAnnualCost: 0,
        netMonthlyCost: 0,
        ownerHours: 400,
        charterRevenueOffset: 0,
        costPerOwnerHour: 0,
        aircraftValue: 25000000,
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
    });

    expect(errors).toEqual([]);
  });

  it("flags missing aircraft_value at publish time", () => {
    const payload = {
      aircraftList: [
        {
          id: "a1",
          label: "N123",
          calculationAssumptions: { owner_annual_hours: "400", pic_count: "1", sic_count: "0" },
        },
      ],
    } as unknown as ProposalSnapshotPayload;

    const errors = validateSnapshotPayload(payload);
    expect(errors.some((e) => e.includes("aircraft_value"))).toBe(true);
  });
});
