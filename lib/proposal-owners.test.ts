import { describe, expect, it } from "vitest";
import {
  mergeOwnerProfilesAfterPersist,
  normalizeProfilesForCount,
  parseEquityPercentInput,
  validateOwnerProfiles,
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
    expect(next[0].ownershipPercent).toBe(50);
    expect(next[1].ownershipPercent).toBe(50);
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
