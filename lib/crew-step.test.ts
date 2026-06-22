import { describe, expect, it } from "vitest";
import {
  buildCrewLadder,
  crewAtStep,
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

describe("patchAssumptionsWithCrewStep", () => {
  it("auto-steps crew when owner hours exceed 2-pilot capacity", () => {
    const next = patchAssumptionsWithCrewStep(
      { owner_annual_hours: "500", crew_step_index: "0", lead_pilot_enabled: "no" },
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
