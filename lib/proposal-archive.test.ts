import { describe, expect, it } from "vitest";
import { isProposalArchived } from "@/lib/proposal-archive";

describe("isProposalArchived", () => {
  it("returns false for null proposal", () => {
    expect(isProposalArchived(null)).toBe(false);
  });

  it("returns false when deletedAt is null", () => {
    expect(isProposalArchived({ deletedAt: null })).toBe(false);
  });

  it("returns true when deletedAt is set", () => {
    expect(isProposalArchived({ deletedAt: new Date() })).toBe(true);
  });
});
