import { describe, expect, it } from "vitest";
import {
  CUSTOM_FIXED_WILDCARD,
  isClientHiddenLine,
  lineSetting,
  parseClientHidden,
  parseUsageTypeConfig,
  toClientHidden,
  toLineVisibility,
  usageTypeAssumptionPatch,
  PROFORMA_CLIENT_HIDDEN_KEY,
  SHOW_REVENUE_SECTION_KEY,
} from "@/lib/usage-type-config";
import { setPageUsageType, pageAppliesToUsageType } from "@/lib/usage-type-pages";
import { isProFormaLineVisible, PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import { filterClientStatementRows } from "@/lib/workspace-proforma-client";
import { buildWorkbenchPayload } from "@/components/internal/data-hub/record-workbench";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";

describe("parseUsageTypeConfig", () => {
  it("fills defaults and ignores junk, unknown lines and bad values", () => {
    expect(parseUsageTypeConfig(null)).toEqual({ version: 1, showRevenueSection: true, lines: {} });
    const c = parseUsageTypeConfig({
      showRevenueSection: false,
      future: 1,
      lines: { fet_refund: { include: false }, retired_line: { include: false }, hangar_pl: "x" },
    });
    expect(c.showRevenueSection).toBe(false);
    expect(c.lines).toEqual({ fet_refund: { include: false, showClient: true } });
  });

  it("defaults insurance/registration to excluded (previous seed behavior), everything else included", () => {
    const c = parseUsageTypeConfig({});
    expect(lineSetting(c, "insurance_pl").include).toBe(false);
    expect(lineSetting(c, "registration_pl").include).toBe(false);
    expect(lineSetting(c, "hangar_pl")).toEqual({ include: true, showClient: true });
    expect(lineSetting(c, "brand_new_line")).toEqual({ include: true, showClient: true });
  });

  it("applies the custom fixed cost wildcard to every custom line", () => {
    const c = parseUsageTypeConfig({ lines: { [CUSTOM_FIXED_WILDCARD]: { include: true, showClient: false } } });
    expect(lineSetting(c, "custom_fixed_abc")).toEqual({ include: true, showClient: false });
    expect(isClientHiddenLine("custom_fixed_abc", toClientHidden(c))).toBe(true);
  });
});

describe("toLineVisibility", () => {
  it("includes a line only when both the usage type and the aircraft type allow it", () => {
    const c = parseUsageTypeConfig({ lines: { fet_refund: { include: false, showClient: true } } });
    const v = toLineVisibility(c, { owner_trip: false, hangar_pl: true, some_warehouse_only_key: false });
    expect(v.fet_refund).toBe(false); // usage type excludes
    expect(v.owner_trip).toBe(false); // warehouse excludes
    expect(v.hangar_pl).toBe(true);
    expect(v.some_warehouse_only_key).toBe(false);
  });

  it("excluding the custom wildcard hides custom lines in the math", () => {
    const c = parseUsageTypeConfig({ lines: { [CUSTOM_FIXED_WILDCARD]: { include: false, showClient: true } } });
    const v = toLineVisibility(c);
    expect(isProFormaLineVisible("custom_fixed_x1", v)).toBe(false);
    expect(isProFormaLineVisible("custom_fixed_x1", { ...v, custom_fixed_x1: true })).toBe(true);
    expect(isProFormaLineVisible("hangar_pl", v)).toBe(true);
  });
});

describe("usageTypeAssumptionPatch", () => {
  it("writes charter flag, line visibility, client-hidden list and revenue switch", () => {
    const config = parseUsageTypeConfig({
      showRevenueSection: false,
      lines: { insurance_pl: { include: true, showClient: false } },
    });
    const patch = usageTypeAssumptionPatch({ config, charterEnabled: true });
    expect(patch.charter_enabled).toBe("true");
    expect(JSON.parse(patch[PROFORMA_VISIBILITY_KEY]!).insurance_pl).toBe(true);
    expect(parseClientHidden(patch)).toEqual(["insurance_pl"]);
    expect(patch[SHOW_REVENUE_SECTION_KEY]).toBe("false");
  });

  it("doesn't list excluded lines as client-hidden (they're already gone)", () => {
    const config = parseUsageTypeConfig({ lines: { hangar_pl: { include: false, showClient: false } } });
    expect(toClientHidden(config)).not.toContain("hangar_pl");
  });
});

describe("filterClientStatementRows with usage-type display settings", () => {
  const row = (key: string, layout: ProFormaStatementRow["layout"], kind: ProFormaStatementRow["kind"] = "line") =>
    ({ key, label: key, kind, layout, annual: 100, monthly: 100 / 12, toggleable: kind === "line" }) as ProFormaStatementRow;
  const rows = [
    row("section_revenue_Revenue", "revenue", "section"),
    row("charter_revenue_block", "revenue"),
    row("total_revenue", "revenue", "subtotal"),
    row("section_fixed_Fixed", "fixed", "section"),
    row("insurance_pl", "fixed"),
    row("hangar_pl", "fixed"),
    row("total_fixed_ownership", "fixed", "subtotal"),
  ];

  it("hides client-hidden lines but keeps totals", () => {
    const out = filterClientStatementRows(rows, {
      charter_enabled: "true",
      [PROFORMA_CLIENT_HIDDEN_KEY]: JSON.stringify(["insurance_pl"]),
    });
    const keys = out.map((r) => r.key);
    expect(keys).not.toContain("insurance_pl");
    expect(keys).toContain("hangar_pl");
    expect(keys).toContain("total_fixed_ownership");
  });

  it("drops the whole Revenue section when the switch is off", () => {
    const out = filterClientStatementRows(rows, { charter_enabled: "true", [SHOW_REVENUE_SECTION_KEY]: "false" });
    expect(out.some((r) => r.layout === "revenue")).toBe(false);
    expect(out.map((r) => r.key)).toContain("insurance_pl");
  });
});

describe("setPageUsageType", () => {
  const all = ["a", "b", "c"];
  it("treats an empty list as all types and collapses back to [] when all are selected", () => {
    expect(pageAppliesToUsageType([], "b")).toBe(true);
    expect(setPageUsageType([], "b", false, all)).toEqual(["a", "c"]);
    expect(setPageUsageType(["a", "c"], "b", true, all)).toEqual([]);
    expect(setPageUsageType(["a"], "c", true, all)).toEqual(["a", "c"]);
  });
  it("refuses to leave a page with no usage types", () => {
    expect(setPageUsageType(["a"], "a", false, all)).toBeNull();
    expect(setPageUsageType([], "a", false, ["a"])).toBeNull();
  });
});

describe("buildWorkbenchPayload", () => {
  it("sends bool fields as real booleans (the API rejects strings)", () => {
    const body = buildWorkbenchPayload(
      [
        { key: "active", label: "Active", type: "bool" },
        { key: "sortOrder", label: "Sort", type: "number" },
        { key: "name", label: "Name" },
      ],
      { active: "true", sortOrder: "2", name: "X" }
    );
    expect(body).toEqual({ active: true, sortOrder: 2, name: "X" });
    expect(buildWorkbenchPayload([{ key: "active", label: "Active", type: "bool" }], {})).toEqual({ active: false });
  });
});

describe("resolveSectionUsageTypeIds", () => {
  it("takes a proposal page's usage types from the master page with the same slug", async () => {
    const { resolveSectionUsageTypeIds } = await import("@/lib/usage-type-pages");
    const bySlug = new Map([["welcome", ["a"]], ["my-custom", ["b"]]]);
    expect(resolveSectionUsageTypeIds({ sectionType: "welcome" }, bySlug)).toEqual(["a"]);
    expect(resolveSectionUsageTypeIds({ sectionType: "custom", pageSlug: "my-custom" }, bySlug)).toEqual(["b"]);
    // Pages with no master (per-proposal custom pages) apply to every usage type.
    expect(resolveSectionUsageTypeIds({ sectionType: "custom", pageSlug: "only-here" }, bySlug)).toEqual([]);
  });
});
