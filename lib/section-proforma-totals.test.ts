import { describe, expect, it } from "vitest";
import { computeSectionProFormaTotal } from "@/lib/section-proforma-totals";
import { buildEffectiveAssumptions } from "@/lib/resolve-effective-assumptions";

const warehouseDefaults = {
  max_usage_2_pilots: "450",
  max_usage_3_pilots: "600",
};

describe("computeSectionProFormaTotal revenue rates", () => {
  it("shows charter effective rate per hour, not annual revenue", () => {
    const effective = buildEffectiveAssumptions(
      {
        usage_type: "part_91_135",
        charter_rate: "5000",
        charter_payback_pct: "75",
        owner_annual_hours: "100",
        fuel_surcharge: "200",
      },
      warehouseDefaults
    );

    const charter = computeSectionProFormaTotal(
      { label: "Charter rate (effective)", type: "lineRate", proformaLine: "charter_revenue_block" },
      effective
    );

    expect(charter?.formatted).toBe("$3,750/hr");
    expect(charter?.formatted).not.toMatch(/000,000/);
  });

  it("shows fuel surcharge rate per hour", () => {
    const effective = buildEffectiveAssumptions(
      {
        usage_type: "part_91_135",
        charter_rate: "5000",
        charter_payback_pct: "75",
        owner_annual_hours: "100",
        fuel_surcharge: "200",
      },
      warehouseDefaults
    );

    const fuel = computeSectionProFormaTotal(
      { label: "Fuel surcharge", type: "lineRate", proformaLine: "fuel_surcharge" },
      effective
    );

    expect(fuel?.formatted).toBe("$200/hr");
  });
});
