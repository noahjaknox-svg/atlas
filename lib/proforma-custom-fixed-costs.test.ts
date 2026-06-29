import { describe, expect, it } from "vitest";
import { buildProFormaStatement } from "@/lib/proforma-statement";
import { applyProFormaVisibility } from "@/lib/proforma-line-visibility";
import {
  customFixedCostLineKey,
  normalizeProformaCustomFixedCostsAssumption,
  parseProformaCustomFixedCosts,
  parseProformaCustomFixedCostsStored,
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
  sumProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";
import { computeTotalFixedFromAssumptions } from "@/lib/proforma";

const BASE = {
  usage_type: "part_91",
  owner_annual_hours: "400",
  crew_total: "300000",
  management_fee: "50000",
};

describe("proforma custom fixed costs", () => {
  it("parses and serializes custom fixed cost line items", () => {
    const items = [
      { id: "a", name: "Legal retainer", amount: 12000 },
      { id: "b", name: "Hangar extras", amount: 8000 },
    ];
    const serialized = serializeProformaCustomFixedCosts(items);
    expect(JSON.parse(serialized)).toEqual(items);

    const parsed = parseProformaCustomFixedCosts({
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serialized,
    });
    expect(parsed).toEqual(items);
    expect(sumProformaCustomFixedCosts(items)).toBe(20000);
  });

  it("serializes empty list as JSON array for DB clear on autosave", () => {
    expect(serializeProformaCustomFixedCosts([])).toBe("[]");
    expect(parseProformaCustomFixedCostsStored({ [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: "[]" })).toEqual(
      []
    );
    expect(parseProformaCustomFixedCosts({ [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: "[]" })).toEqual([]);
  });

  it("ignores draft rows without name or amount in statement math", () => {
    const stored = serializeProformaCustomFixedCosts([
      { id: "draft", name: "", amount: 0 },
      { id: "ok", name: "Storage", amount: 5000 },
    ]);
    expect(parseProformaCustomFixedCosts({ [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: stored })).toEqual([
      { id: "ok", name: "Storage", amount: 5000 },
    ]);
  });

  it("normalizeProformaCustomFixedCostsAssumption drops blank draft rows for persist", () => {
    const raw = serializeProformaCustomFixedCosts([
      { id: "ghost", name: "", amount: 0 },
      { id: "ok", name: "Test 5", amount: 12000 },
    ]);
    const normalized = normalizeProformaCustomFixedCostsAssumption({
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: raw,
    });
    expect(parseProformaCustomFixedCosts(normalized)).toEqual([
      { id: "ok", name: "Test 5", amount: 12000 },
    ]);
    expect(JSON.parse(normalized[PROFORMA_CUSTOM_FIXED_COSTS_KEY]!)).toEqual([
      { id: "ok", name: "Test 5", amount: 12000 },
    ]);
  });

  it("adds custom lines to fixed ownership totals and statement rows", () => {
    const assumptions = {
      ...BASE,
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts([
        { id: "legal", name: "Legal retainer", amount: 10000 },
      ]),
    };

    expect(computeTotalFixedFromAssumptions(assumptions)).toBe(360000);

    const { rows } = buildProFormaStatement(assumptions);
    const customRow = rows.find((r) => r.key === customFixedCostLineKey("legal"));
    expect(customRow?.label).toBe("Legal retainer");
    expect(customRow?.annual).toBe(-10000);

    const totalRow = rows.find((r) => r.key === "total_fixed_ownership");
    expect(totalRow?.annual).toBe(-360000);
  });

  it("respects visibility toggles for custom fixed cost lines", () => {
    const assumptions = {
      ...BASE,
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts([
        { id: "legal", name: "Legal retainer", amount: 10000 },
      ]),
    };
    const { rows } = buildProFormaStatement(assumptions);
    const key = customFixedCostLineKey("legal");
    const hidden = applyProFormaVisibility(
      rows,
      { [key]: false },
      400,
      assumptions
    );
    const customRow = hidden.find((r) => r.key === key);
    expect(customRow?.annual).toBe(0);
    expect(customRow?.hidden).toBe(true);

    const totalRow = hidden.find((r) => r.key === "total_fixed_ownership");
    expect(totalRow?.annual).toBe(-350000);
  });
});
