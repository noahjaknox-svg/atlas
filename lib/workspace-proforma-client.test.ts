import { describe, expect, it } from "vitest";
import {
  applyClientProFormaOverrides,
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
} from "@/lib/workspace-proforma-client";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";

const USAGE_TIERS = {
  max_usage_1_pilot: "0",
  max_usage_2_pilots: "450",
  max_usage_3_pilots: "600",
  max_usage_4_pilots: "700",
  max_usage_5_pilots: "800",
  max_usage_6_pilots: "900",
  crew_step_index: "0",
  lead_pilot_enabled: "no",
  owner_annual_hours: "250",
  max_annual_utilization: "450",
  charter_block_to_flight_ratio: "1.13",
  usage_type: "part_91_135",
  variable_cost_per_hour: "1200",
  pic_count: "1",
  sic_count: "1",
  crew_total: "400000",
};

describe("applyClientProFormaOverrides", () => {
  it("auto-steps crew when owner hours exceed 2-pilot capacity", () => {
    const next = applyClientProFormaOverrides(USAGE_TIERS, { ownerHours: 500 });
    expect(next.crew_step_index).toBe("1");
    expect(next.pic_count).toBe("2");
    expect(next.sic_count).toBe("1");
    expect(next.max_annual_utilization).toBe("600");
  });

  it("is idempotent when owner hours match stored assumptions", () => {
    const base = { ...USAGE_TIERS, owner_annual_hours: "250" };
    const patched = applyClientProFormaOverrides(base, { ownerHours: 250 });
    expect(patched.crew_step_index).toBe(base.crew_step_index);
    expect(patched.max_annual_utilization).toBe(base.max_annual_utilization);
  });

  it("patches multi-owner JSON and total before crew step", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "Owner A", annualFlightHours: 200, ownershipPercent: 50 },
      { sortOrder: 1, displayName: "Owner B", annualFlightHours: 150, ownershipPercent: 50 },
    ];
    const next = applyClientProFormaOverrides(USAGE_TIERS, {
      ownerProfiles: profiles,
      proformaOwnerHours: [300, 250],
    });
    expect(next.owner_annual_hours).toBe("550");
    expect(next.owner_proforma_hours_json).toBe("[300,250]");
    expect(next.crew_step_index).toBe("1");
  });
});

describe("computeWorkspaceProFormaForClient", () => {
  it("updates charter flight hours when owner hours increase", () => {
    const low = computeWorkspaceProFormaForClient(USAGE_TIERS, { ownerHours: 100 });
    const high = computeWorkspaceProFormaForClient(USAGE_TIERS, { ownerHours: 400 });
    const lowCharter = parseFloat(low.calculationAssumptions.charter_flight_hours ?? "0");
    const highCharter = parseFloat(high.calculationAssumptions.charter_flight_hours ?? "0");
    expect(highCharter).toBeLessThan(lowCharter);
  });
});

describe("resolveClientCrewSummary", () => {
  it("reports crew composition and utilization", () => {
    const summary = resolveClientCrewSummary(USAGE_TIERS);
    expect(summary.composition).toContain("PIC");
    expect(summary.totalPilots).toBe(2);
    expect(summary.maxAnnualUtilization).toBe(450);
    expect(summary.ownerHours).toBe(250);
    expect(summary.charterFlightHours).toBeGreaterThan(0);
  });

  it("flags when owner hours require higher crew step", () => {
    const summary = resolveClientCrewSummary(USAGE_TIERS, {
      ownerProfiles: [],
    });
    const high = applyClientProFormaOverrides(USAGE_TIERS, { ownerHours: 500 });
    const highSummary = resolveClientCrewSummary(high);
    expect(highSummary.requiredByOwnerHours).toBe(true);
    expect(summary.requiredByOwnerHours).toBe(false);
  });
});
