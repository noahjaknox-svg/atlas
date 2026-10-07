import { describe, expect, it } from "vitest";
import { DEFAULT_LINE_CATALOG } from "@/lib/line-item-catalog";
import { WAREHOUSE_AIRCRAFT_FIELDS } from "@/lib/warehouse-aircraft-fields";
import { lineSource, normalizeTypeSection, TYPE_SECTION_NAMES } from "@/lib/aircraft-type-line-sources";
import { COST_OVERRIDE_KEYS, COST_OVERRIDE_LINES, costOverridesForStorage, parseCostOverrides } from "@/lib/cost-overrides";

describe("line sources", () => {
  it("every built-in catalog line has exactly one home, and set_here lines map to a real column", () => {
    const columns = new Set(WAREHOUSE_AIRCRAFT_FIELDS.map((f) => f.key));
    for (const item of DEFAULT_LINE_CATALOG) {
      const src = lineSource(item);
      expect(src.kind, item.key).toMatch(/^(set_here|company|fbo|calculated)$/);
      if (src.kind === "set_here") expect(columns.has(src.fieldKey!), `${item.key} → ${src.fieldKey}`).toBe(true);
      if (src.kind === "calculated") expect(src.note.length).toBeGreaterThan(0);
    }
  });

  it("company-owned lines with an override cover management, maintenance, insurance and registration", () => {
    const overridable = DEFAULT_LINE_CATALOG.map((i) => lineSource(i)).flatMap((s) => (s.kind === "company" && s.overrideLine ? [s.overrideLine] : []));
    expect(overridable.sort()).toEqual(COST_OVERRIDE_LINES.map((l) => l.line).sort());
  });

  it("every aircraft type field lands in exactly one existing tab", () => {
    const tabs = new Set<string>(TYPE_SECTION_NAMES);
    for (const f of WAREHOUSE_AIRCRAFT_FIELDS) expect(tabs.has(f.group), f.key).toBe(true);
    expect(new Set(WAREHOUSE_AIRCRAFT_FIELDS.map((f) => f.key)).size).toBe(WAREHOUSE_AIRCRAFT_FIELDS.length);
  });

  it("old section names map to their new tab", () => {
    expect(normalizeTypeSection("Line items")).toBe("Annual Expenses");
    expect(normalizeTypeSection("Utilization")).toBe("Crew");
    expect(normalizeTypeSection("Empty Legs")).toBe("Marketplace");
    expect(normalizeTypeSection("Finances")).toBe("Revenue");
    expect(normalizeTypeSection("Fuel")).toBe("Performance");
    expect(normalizeTypeSection("afm")).toBe("AFM");
    expect(normalizeTypeSection("nonsense")).toBe("General");
    expect(normalizeTypeSection(null)).toBe("General");
  });
});

describe("cost overrides", () => {
  it("keeps only valid allowlisted values and stores empty as null", () => {
    expect(parseCostOverrides({ management_fee: "150000", insurance_mode: "percent_hull", insurance_premium_percent: 1.5, bogus: "x", registration_tax_rate: "-3", insurance_annual: "abc" })).toEqual({
      management_fee: "150000",
      insurance_mode: "percent_hull",
      insurance_premium_percent: "1.5",
    });
    expect(parseCostOverrides({ insurance_mode: "weird" })).toEqual({});
    expect(parseCostOverrides(null)).toEqual({});
    expect(costOverridesForStorage({ management_fee: "" })).toBeNull();
    expect(costOverridesForStorage({ management_fee: "1" })).toEqual({ management_fee: "1" });
    expect(COST_OVERRIDE_KEYS.length).toBe(6);
  });

  it("an override wins over the company default but not over a proposal edit (seed merge order)", () => {
    const company = { management_fee: "120000" };
    const typeOverride = parseCostOverrides({ management_fee: "150000" });
    const seeded = { ...company, ...typeOverride };
    expect(seeded.management_fee).toBe("150000");
    const proposalEdit = { ...seeded, management_fee: "99000" };
    expect(proposalEdit.management_fee).toBe("99000");
    expect({ ...company, ...parseCostOverrides({}) }.management_fee).toBe("120000");
  });
});
