import { describe, expect, it } from "vitest";
import {
  assumptionsAfterOwnerDefaultsChange,
  mergeOwnerProfilesAfterPersist,
  normalizeProfilesForCount,
  ownerDefaultHoursChanged,
  ownerHoursForUtilization,
  parseEquityPercentInput,
  parseProformaOwnerHoursJson,
  patchProformaOwnerHoursAtIndex,
  proformaHoursForProfiles,
  profilesWithProformaHours,
  seedProformaHoursInAssumptions,
  validateOwnerProfiles,
  validateProformaOwnerHours,
  OWNER_PROFORMA_HOURS_KEY,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";

describe("normalizeProfilesForCount", () => {
  it("splits equity evenly when increasing owner count", () => {
    const existing: ProposalOwnerProfile[] = [
      {
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 400,
        ownershipPercent: 100,
      },
    ];

    const next = normalizeProfilesForCount(2, existing, 400);

    expect(next).toHaveLength(2);
    expect(next[0].ownershipPercent).toBe(100);
    expect(next[1].ownershipPercent).toBe(0);
    expect(next[0].annualFlightHours).toBe(400);
    expect(next[1].annualFlightHours).toBe(0);
  });

  it("preserves existing equity when count stays the same", () => {
    const existing: ProposalOwnerProfile[] = [
      {
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 300,
        ownershipPercent: 60,
      },
      {
        sortOrder: 1,
        displayName: "Owner 2",
        annualFlightHours: 100,
        ownershipPercent: 40,
      },
    ];

    const next = normalizeProfilesForCount(2, existing, 400);

    expect(next[0].ownershipPercent).toBe(60);
    expect(next[1].ownershipPercent).toBe(40);
  });
});

describe("parseEquityPercentInput", () => {
  it("returns null for empty input", () => {
    expect(parseEquityPercentInput("")).toBeNull();
    expect(parseEquityPercentInput("   ")).toBeNull();
  });

  it("parses numeric strings", () => {
    expect(parseEquityPercentInput("60")).toBe(60);
    expect(parseEquityPercentInput("33.5")).toBe(33.5);
  });
});

describe("mergeOwnerProfilesAfterPersist", () => {
  it("applies saved profiles when local state was not edited during persist", () => {
    const local: ProposalOwnerProfile[] = [
      {
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 400,
        ownershipPercent: 50,
      },
      {
        sortOrder: 1,
        displayName: "Owner 2",
        annualFlightHours: 0,
        ownershipPercent: 50,
      },
    ];
    const saved: ProposalOwnerProfile[] = [
      { ...local[0], id: "a" },
      { ...local[1], id: "b" },
    ];

    expect(mergeOwnerProfilesAfterPersist(local, saved, true)).toEqual(saved);
  });

  it("keeps local equity when local state changed during persist", () => {
    const local: ProposalOwnerProfile[] = [
      {
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 400,
        ownershipPercent: 60,
      },
      {
        sortOrder: 1,
        displayName: "Owner 2",
        annualFlightHours: 0,
        ownershipPercent: 40,
      },
    ];
    const saved: ProposalOwnerProfile[] = [
      {
        id: "a",
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 400,
        ownershipPercent: 50,
      },
      {
        id: "b",
        sortOrder: 1,
        displayName: "Owner 2",
        annualFlightHours: 0,
        ownershipPercent: 50,
      },
    ];

    expect(mergeOwnerProfilesAfterPersist(local, saved, false)).toEqual([
      { ...local[0], id: "a" },
      { ...local[1], id: "b" },
    ]);
  });
});

describe("validateOwnerProfiles", () => {
  it("requires equity to total 100 for multi-owner setups", () => {
    const profiles: ProposalOwnerProfile[] = [
      {
        sortOrder: 0,
        displayName: "Owner 1",
        annualFlightHours: 400,
        ownershipPercent: 60,
      },
      {
        sortOrder: 1,
        displayName: "Owner 2",
        annualFlightHours: 0,
        ownershipPercent: 50,
      },
    ];

    const result = validateOwnerProfiles(profiles, 450, true);
    expect(result.ok).toBe(false);
    expect(result.messages[0]).toMatch(/100/);
  });
});

describe("ownerDefaultHoursChanged", () => {
  it("detects default hour changes", () => {
    const prev: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "A", annualFlightHours: 400, ownershipPercent: 100 },
    ];
    const next: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "A", annualFlightHours: 350, ownershipPercent: 100 },
    ];
    expect(ownerDefaultHoursChanged(prev, next)).toBe(true);
    expect(
      ownerDefaultHoursChanged(next, [{ ...next[0], displayName: "Alice" }])
    ).toBe(false);
  });
});

describe("proforma hours", () => {
  const profiles: ProposalOwnerProfile[] = [
    { sortOrder: 0, displayName: "A", annualFlightHours: 200, ownershipPercent: 60 },
    { sortOrder: 1, displayName: "B", annualFlightHours: 100, ownershipPercent: 40 },
  ];

  it("seeds pro forma hours from profile defaults", () => {
    const seeded = seedProformaHoursInAssumptions({}, profiles);
    expect(seeded.owner_annual_hours).toBe("300");
    expect(parseProformaOwnerHoursJson(seeded, 2)).toEqual([200, 100]);
  });

  it("derives utilization hours from pro forma assumptions, not profile defaults", () => {
    const assumptions = {
      [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify([250, 150]),
      owner_annual_hours: "400",
    };
    expect(ownerHoursForUtilization(profiles, assumptions)).toBe(400);
    expect(proformaHoursForProfiles(profiles, assumptions)).toEqual([250, 150]);
  });

  it("patches pro forma hours at index without changing profiles", () => {
    const assumptions = seedProformaHoursInAssumptions({}, profiles);
    const patched = patchProformaOwnerHoursAtIndex(assumptions, profiles, 0, 180);
    expect(proformaHoursForProfiles(profiles, patched)).toEqual([180, 100]);
    expect(profiles[0].annualFlightHours).toBe(200);
  });

  it("profilesWithProformaHours overlays scenario hours onto profiles", () => {
    const assumptions = {
      [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify([250, 150]),
    };
    const merged = profilesWithProformaHours(profiles, assumptions);
    expect(merged[0].annualFlightHours).toBe(250);
    expect(merged[1].annualFlightHours).toBe(150);
  });

  it("validateProformaOwnerHours checks scenario hours against max utilization", () => {
    const assumptions = {
      [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify([300, 250]),
    };
    const result = validateProformaOwnerHours(profiles, assumptions, 500);
    expect(result.ok).toBe(false);
    expect(result.totalHours).toBe(550);
  });
});

describe("ownerHoursForUtilization", () => {
  it("sums pro forma hours when multiple owners", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "A", annualFlightHours: 300, ownershipPercent: 50 },
      { sortOrder: 1, displayName: "B", annualFlightHours: 200, ownershipPercent: 50 },
    ];
    expect(
      ownerHoursForUtilization(profiles, {
        [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify([300, 200]),
      })
    ).toBe(500);
  });

  it("uses patched pro forma hours for single owner, not stale JSON alone", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "Owner", annualFlightHours: 400, ownershipPercent: 100 },
    ];
    const assumptions = {
      [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify([400]),
      owner_annual_hours: "400",
    };
    const patched = patchProformaOwnerHoursAtIndex(assumptions, profiles, 0, 50);
    expect(ownerHoursForUtilization(profiles, patched)).toBe(50);
    expect(parseProformaOwnerHoursJson(patched, 1)).toEqual([50]);
  });
});

describe("assumptionsAfterOwnerDefaultsChange", () => {
  it("auto-steps crew when multi-owner total exceeds 2-pilot capacity", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "A", annualFlightHours: 300, ownershipPercent: 50 },
      { sortOrder: 1, displayName: "B", annualFlightHours: 200, ownershipPercent: 50 },
    ];
    const next = assumptionsAfterOwnerDefaultsChange(
      { crew_step_index: "0", lead_pilot_enabled: "no" },
      profiles,
      "hybrid",
      {
        max_usage_1_pilot: "250",
        max_usage_2_pilots: "450",
        max_usage_3_pilots: "600",
      }
    );
    expect(next.owner_annual_hours).toBe("500");
    expect(parseProformaOwnerHoursJson(next, 2)).toEqual([300, 200]);
    expect(next.crew_step_index).toBe("1");
    expect(next.max_annual_utilization).toBe("600");
  });

  it("preserves pro forma scenario hours when not seeding from owner defaults", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "Owner", annualFlightHours: 400, ownershipPercent: 100 },
    ];
    const next = assumptionsAfterOwnerDefaultsChange(
      {
        owner_annual_hours: "50",
        owner_proforma_hours_json: "[50]",
        crew_step_index: "0",
        max_annual_utilization: "450",
      },
      profiles,
      "hybrid",
      {},
      false
    );
    expect(next.owner_annual_hours).toBe("50");
    expect(next.owner_proforma_hours_json).toBe("[50]");
    expect(next.crew_step_index).toBe("0");
  });
});
