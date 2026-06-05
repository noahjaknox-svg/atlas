import { describe, expect, it } from "vitest";
import {
  pickBestHangarRow,
  resolveHangarCostFromRows,
  resolveHangarFromRow,
  toHangarAssumptions,
} from "@/lib/resolve-hangar-cost";

describe("resolveHangarFromRow", () => {
  it("uses quoted annual when present", () => {
    const result = resolveHangarFromRow(
      { quotedAnnual: 120000, pricingMethod: "quoted" } as never,
      4550
    );
    expect(result).toEqual({ monthly: 10000, method: "quoted" });
  });

  it("computes from sqft rate when no quote", () => {
    const result = resolveHangarFromRow(
      { ratePerSqftAnnual: 24, pricingMethod: "sqft_rate" } as never,
      4550
    );
    expect(result?.monthly).toBe(Math.round((24 * 4550) / 12));
  });

  it("falls back to monthly cost base", () => {
    const result = resolveHangarFromRow(
      { monthlyCostBase: 9100, pricingMethod: "category_estimate" } as never,
      null
    );
    expect(result).toEqual({ monthly: 9100, method: "category_estimate" });
  });
});

describe("pickBestHangarRow", () => {
  it("prefers quoted over sqft over monthly", () => {
    const rows = [
      { monthlyCostBase: 5000 } as never,
      { ratePerSqftAnnual: 20 } as never,
      { quotedAnnual: 96000 } as never,
    ];
    expect(pickBestHangarRow(rows)?.quotedAnnual).toBe(96000);
  });
});

describe("resolveHangarCostFromRows", () => {
  it("returns assumption keys", () => {
    const result = resolveHangarCostFromRows({
      hangarRows: [{ quotedAnnual: 84000, pricingMethod: "quoted" } as never],
      cabinSqft: 2940,
    });
    expect(result).toEqual(toHangarAssumptions(7000));
  });
});
