import { describe, expect, it } from "vitest";
import {
  mergeAssumptionRowsForInstance,
  overlayLegacyMetaAssumptionKeys,
} from "@/lib/proposal-assumption-load";
import {
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";

describe("mergeAssumptionRowsForInstance", () => {
  it("uses per-aircraft rows without legacy overwrite", () => {
    const rows = [
      { category: "ac_a1", assumptionName: "owner_annual_hours", value: "400" },
      { category: "aircraft", assumptionName: "aircraft_value", value: "0" },
    ];

    const merged = mergeAssumptionRowsForInstance(rows, "a1");

    expect(merged.owner_annual_hours).toBe("400");
    expect(merged.aircraft_value).toBeUndefined();
  });

  it("falls back to legacy rows when aircraft category is empty", () => {
    const rows = [
      { category: "aircraft", assumptionName: "aircraft_value", value: "18000000" },
      { category: "aircraft", assumptionName: "owner_annual_hours", value: "250" },
    ];

    const merged = mergeAssumptionRowsForInstance(rows, "a1");

    expect(merged.aircraft_value).toBe("18000000");
    expect(merged.owner_annual_hours).toBe("250");
  });

  it("does not fall back to legacy when proposal has any ac_* rows", () => {
    const rows = [
      { category: "ac_a2", assumptionName: "owner_annual_hours", value: "300" },
      { category: "aircraft", assumptionName: "aircraft_value", value: "18000000" },
    ];

    const merged = mergeAssumptionRowsForInstance(rows, "a1");

    expect(merged.aircraft_value).toBeUndefined();
  });

  it("overlays legacy META keys when missing from per-aircraft category", () => {
    const customJson = serializeProformaCustomFixedCosts([
      { id: "test-id", name: "Test 2", amount: 90000 },
    ]);
    const rows = [
      { category: "ac_a1", assumptionName: "owner_annual_hours", value: "400" },
      {
        category: "costs",
        assumptionName: PROFORMA_CUSTOM_FIXED_COSTS_KEY,
        value: customJson,
      },
    ];

    const merged = mergeAssumptionRowsForInstance(rows, "a1");

    expect(merged.owner_annual_hours).toBe("400");
    expect(merged[PROFORMA_CUSTOM_FIXED_COSTS_KEY]).toBe(customJson);
  });

  it("prefers per-aircraft META keys over legacy", () => {
    const acJson = serializeProformaCustomFixedCosts([
      { id: "ac", name: "From aircraft category", amount: 1000 },
    ]);
    const legacyJson = serializeProformaCustomFixedCosts([
      { id: "legacy", name: "From legacy", amount: 2000 },
    ]);
    const rows = [
      {
        category: "ac_a1",
        assumptionName: PROFORMA_CUSTOM_FIXED_COSTS_KEY,
        value: acJson,
      },
      {
        category: "costs",
        assumptionName: PROFORMA_CUSTOM_FIXED_COSTS_KEY,
        value: legacyJson,
      },
    ];

    const merged = mergeAssumptionRowsForInstance(rows, "a1");

    expect(merged[PROFORMA_CUSTOM_FIXED_COSTS_KEY]).toBe(acJson);
  });

  it("overlayLegacyMetaAssumptionKeys fills only missing keys", () => {
    const customJson = serializeProformaCustomFixedCosts([
      { id: "x", name: "Legacy line", amount: 5000 },
    ]);
    const rows = [
      {
        category: "costs",
        assumptionName: PROFORMA_CUSTOM_FIXED_COSTS_KEY,
        value: customJson,
      },
    ];

    const merged = overlayLegacyMetaAssumptionKeys(
      { owner_annual_hours: "200" },
      rows
    );

    expect(merged.owner_annual_hours).toBe("200");
    expect(merged[PROFORMA_CUSTOM_FIXED_COSTS_KEY]).toBe(customJson);
  });
});
