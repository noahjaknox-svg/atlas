import { describe, expect, it } from "vitest";
import { stripLegacyEstimatedHangar } from "@/lib/hangar-assumptions";
import { buildEffectiveAssumptions } from "@/lib/resolve-effective-assumptions";

describe("stripLegacyEstimatedHangar", () => {
  it("removes stale PrismJet estimate hangar values", () => {
    const cleaned = stripLegacyEstimatedHangar({
      hangar_monthly: "4500",
      hangar_annual: "54000",
      crew_total: "452400",
    });
    expect(cleaned.hangar_monthly).toBeUndefined();
    expect(cleaned.hangar_annual).toBeUndefined();
    expect(cleaned.crew_total).toBe("452400");
  });
});

describe("buildEffectiveAssumptions hangar merge", () => {
  it("uses warehouse hangar default over legacy stored estimate", () => {
    const effective = buildEffectiveAssumptions(
      { hangar_annual: "54000", hangar_monthly: "4500" },
      {
        square_footage: "1500",
        hangar_cost_per_sqft: "24",
        hangar_annual: "36000",
        hangar_calculated_annual: "36000",
      }
    );
    expect(effective.square_footage).toBe("1500");
    expect(effective.hangar_cost_per_sqft).toBe("24");
    expect(effective.hangar_annual).toBe("36000");
  });

  it("keeps stored values over defaults when already set", () => {
    const effective = buildEffectiveAssumptions(
      { square_footage: "1500", hangar_annual: "50000" },
      { square_footage: "1600", hangar_annual: "38400" }
    );
    expect(effective.square_footage).toBe("1500");
    expect(effective.hangar_annual).toBe("50000");
  });
});
