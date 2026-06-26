import { describe, expect, it } from "vitest";
import {
  buildCrewLadder,
  crewAtStep,
  crewLadderReferenceRungs,
  inferStepFromCounts,
  maxUsageForPilots,
  requiredStepForOwnerHours,
  resolveCrewStep,
  totalPilots,
  warehouseMinStep,
  applyCrewStepToAssumptions,
  patchAssumptionsWithCrewStep,
  totalPilotsAtStep,
} from "@/lib/crew-step";

const TIERS = [0, 450, 600, 700, 800, 900] as const;

describe("buildCrewLadder", () => {
  it("follows 1/1 → 2/1 → 2/2 → 3/2 pattern", () => {
    const ladder = buildCrewLadder(4);
    expect(ladder[0]).toEqual({ pic: 1, sic: 1 });
    expect(ladder[1]).toEqual({ pic: 2, sic: 1 });
    expect(ladder[2]).toEqual({ pic: 2, sic: 2 });
    expect(ladder[3]).toEqual({ pic: 3, sic: 2 });
  });
});

describe("crewLadderReferenceRungs", () => {
  it("returns static max usage per ladder step from utilization tiers", () => {
    const rungs = crewLadderReferenceRungs(
      {
        max_usage_1_pilot: "450",
        max_usage_2_pilots: "600",
        max_usage_3_pilots: "700",
        max_usage_4_pilots: "800",
        lead_pilot_enabled: "no",
      },
      {},
      3
    );
    expect(rungs).toHaveLength(3);
    expect(rungs[0]).toMatchObject({ stepIndex: 0, pilots: 2, maxUsage: 600 });
    expect(rungs[1]).toMatchObject({ stepIndex: 1, pilots: 3, maxUsage: 700 });
    expect(rungs[2]).toMatchObject({ stepIndex: 2, pilots: 4, maxUsage: 800 });
  });
});

describe("warehouseMinStep", () => {
  it("returns step 0 for 1 PIC + 1 SIC baseline", () => {
    expect(warehouseMinStep(1, 1)).toBe(0);
  });

  it("returns step 1 for 2 PIC + 1 SIC baseline", () => {
    expect(warehouseMinStep(2, 1)).toBe(1);
  });
});

describe("requiredStepForOwnerHours", () => {
  it("auto-steps when owner hours exceed 2-pilot capacity", () => {
    const minStep = 0;
    const step = requiredStepForOwnerHours(500, [...TIERS], minStep, false);
    expect(crewAtStep(step)).toEqual({ pic: 2, sic: 1 });
    expect(maxUsageForPilots(totalPilots(crewAtStep(step), false), [...TIERS])).toBe(600);
  });

  it("stays at min step when owner hours fit", () => {
    const step = requiredStepForOwnerHours(400, [...TIERS], 0, false);
    expect(step).toBe(0);
  });
});

describe("resolveCrewStep", () => {
  it("uses max of user, required, and min step", () => {
    const resolved = resolveCrewStep({
      ownerHours: 400,
      userStep: 0,
      minStep: 0,
      tiers: [...TIERS],
      leadEnabled: false,
    });
    expect(resolved.stepIndex).toBe(0);
    expect(resolved.maxAnnualUtilization).toBe(450);
  });

  it("lead pilot fills a PIC slot without adding an extra pilot", () => {
    const withoutLead = resolveCrewStep({
      ownerHours: 100,
      userStep: 0,
      minStep: 0,
      tiers: [...TIERS],
      leadEnabled: false,
    });
    const withLead = resolveCrewStep({
      ownerHours: 100,
      userStep: 0,
      minStep: 0,
      tiers: [...TIERS],
      leadEnabled: true,
    });
    expect(withLead.totalPilots).toBe(withoutLead.totalPilots);
    expect(withLead.maxAnnualUtilization).toBe(withoutLead.maxAnnualUtilization);
  });

  it("stores lead as PIC replacement in assumptions", () => {
    const resolved = resolveCrewStep({
      ownerHours: 100,
      userStep: 0,
      minStep: 0,
      tiers: [...TIERS],
      leadEnabled: true,
    });
    const next = applyCrewStepToAssumptions({}, resolved);
    expect(next.pic_count).toBe("0");
    expect(next.sic_count).toBe("1");
    expect(next.lead_pilot_count).toBe("1");
    expect(next.lead_pilot_enabled).toBe("yes");
  });
});

describe("totalPilotsAtStep", () => {
  it("starts at 2 pilots for baseline ladder step", () => {
    expect(totalPilotsAtStep(0)).toBe(2);
    expect(totalPilotsAtStep(1)).toBe(3);
  });
});

describe("default minimum pilots", () => {
  it("maps 3 total pilots to ladder step 1", async () => {
    const {
      parseDefaultMinimumCrewMinStep,
      stepIndexForTotalPilots,
      resolveCrewStepFromAssumptions,
    } = await import("@/lib/crew-step");
    expect(stepIndexForTotalPilots(3)).toBe(1);
    expect(parseDefaultMinimumCrewMinStep({ default_minimum_crew: "3" })).toBe(1);
    const resolved = resolveCrewStepFromAssumptions(
      {
        default_minimum_crew: "3",
        owner_annual_hours: "100",
        max_usage_1_pilot: "0",
        max_usage_2_pilots: "450",
        max_usage_3_pilots: "600",
        max_usage_4_pilots: "700",
        max_usage_5_pilots: "800",
        max_usage_6_pilots: "900",
        lead_pilot_enabled: "no",
      },
      undefined,
      {}
    );
    expect(resolved.minStep).toBe(1);
    expect(resolved.stepIndex).toBeGreaterThanOrEqual(1);
  });
});

describe("patchAssumptionsWithCrewStep", () => {
  it("auto-steps crew when owner hours exceed 2-pilot capacity", () => {
    const next = patchAssumptionsWithCrewStep(
      {
        owner_annual_hours: "500",
        crew_step_index: "0",
        lead_pilot_enabled: "no",
        max_usage_1_pilot: "0",
        max_usage_2_pilots: "450",
        max_usage_3_pilots: "600",
        max_usage_4_pilots: "700",
        max_usage_5_pilots: "800",
        max_usage_6_pilots: "900",
      },
      {},
      { ownerHours: 500 }
    );
    expect(next.crew_step_index).toBe("1");
    expect(next.pic_count).toBe("2");
    expect(next.sic_count).toBe("1");
    expect(next.max_annual_utilization).toBe("600");
  });
});

describe("applyCrewStepToAssumptions", () => {
  it("sets charter hours from max minus owner", () => {
    const resolved = resolveCrewStep({
      ownerHours: 100,
      userStep: 0,
      minStep: 0,
      tiers: [...TIERS],
      leadEnabled: false,
    });
    const next = applyCrewStepToAssumptions(
      {
        owner_annual_hours: "100",
        charter_block_to_flight_ratio: "1.13",
        usage_type: "part_91_135",
      },
      resolved
    );
    expect(next.charter_flight_hours).toBe("350");
    expect(parseFloat(next.charter_block_hours!)).toBeCloseTo(350 * 1.13, 0);
  });
});

describe("inferStepFromCounts", () => {
  it("maps 2/1 to step 1", () => {
    expect(inferStepFromCounts(2, 1)).toBe(1);
  });
});
