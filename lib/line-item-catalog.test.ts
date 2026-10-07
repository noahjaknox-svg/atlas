import { describe, expect, it } from "vitest";
import fixtures from "@/lib/__fixtures__/proforma-golden-assumptions.json";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  DEFAULT_LINE_CATALOG,
  LINE_CATALOG_ASSUMPTION_KEY,
  customLineItemKey,
  normalizeLineCatalog,
  resolveLineCatalog,
  serializeLineCatalog,
  type CatalogLineItem,
} from "@/lib/line-item-catalog";
import { buildProFormaStatement } from "@/lib/proforma-statement";
import { applyProFormaVisibility, parseProFormaVisibility } from "@/lib/proforma-line-visibility";
import { computeTotalFixedFromAssumptions } from "@/lib/proforma";
import { computeWorkspaceProFormaForClient } from "@/lib/workspace-proforma-client";
import { usageTypeLineGroups, toClientHidden, parseUsageTypeConfig } from "@/lib/usage-type-config";

const all = fixtures as Array<{ id: string; assumptions: AssumptionMap }>;
const charter = all.find((f) => f.assumptions.charter_enabled === "true")!.assumptions;
const ownerOnly = all.find((f) => f.assumptions.charter_enabled === "false")!.assumptions;

const custom = (key: string, partial: Partial<CatalogLineItem>): CatalogLineItem => ({
  key,
  label: key,
  section: "fixed",
  kind: "annual",
  source: "aircraft_type",
  assumptionKey: key,
  active: true,
  sortOrder: 500,
  ...partial,
});

function withCatalog(a: AssumptionMap, items: CatalogLineItem[], values: Record<string, string>): AssumptionMap {
  return { ...a, ...values, [LINE_CATALOG_ASSUMPTION_KEY]: serializeLineCatalog(normalizeLineCatalog(items)) };
}

function run(a: AssumptionMap) {
  const st = buildProFormaStatement(a);
  const rows = applyProFormaVisibility(st.rows, parseProFormaVisibility(a), st.utilization.ownerFlightHours, a);
  const get = (k: string) => rows.find((r) => r.key === k);
  return { st, rows, get, net: get("net_annual_owner")!.annual! };
}

describe("line item catalog", () => {
  it("falls back to the built-in lines when no catalog is stored or it is malformed", () => {
    expect(resolveLineCatalog({})).toBe(DEFAULT_LINE_CATALOG);
    expect(resolveLineCatalog({ [LINE_CATALOG_ASSUMPTION_KEY]: "not json" })).toBe(DEFAULT_LINE_CATALOG);
  });

  it("keeps built-in wiring when a stored catalog renames or turns them off", () => {
    const merged = normalizeLineCatalog([{ ...DEFAULT_LINE_CATALOG.find((i) => i.key === "wifi")!, label: "Satellite Wi-Fi", source: "system", systemCalc: "crew" }]);
    const wifi = merged.find((i) => i.key === "wifi")!;
    expect(wifi.label).toBe("Satellite Wi-Fi");
    expect(wifi.source).toBe("aircraft_type"); // wiring can't be overridden
    expect(merged.filter((i) => i.key !== "wifi").every((i) => i.active)).toBe(true);
  });

  it("builds custom keys from the label", () => {
    expect(customLineItemKey("Satcom (Ku)")).toBe("li_satcom_ku");
  });

  it("an unchanged catalog gives identical numbers to the defaults", () => {
    for (const a of [charter, ownerOnly]) {
      const base = run(a);
      const same = run({ ...a, [LINE_CATALOG_ASSUMPTION_KEY]: serializeLineCatalog(DEFAULT_LINE_CATALOG) });
      expect(same.net).toBe(base.net);
    }
  });
});

describe("custom line items in the statement", () => {
  it("annual fixed: adds a row and the amount to fixed totals, net cost and scenario fixed total", () => {
    const base = run(charter);
    const a = withCatalog(charter, [custom("li_nav", { label: "Nav database" })], { li_nav: "8000" });
    const r = run(a);
    expect(r.get("li_nav")).toMatchObject({ label: "Nav database", layout: "fixed", annual: -8000 });
    expect(r.get("total_fixed_ownership")!.annual).toBeCloseTo(base.get("total_fixed_ownership")!.annual! - 8000, 2);
    expect(r.net).toBeCloseTo(base.net - 8000, 2);
    expect(computeTotalFixedFromAssumptions(a)).toBeCloseTo(computeTotalFixedFromAssumptions(charter) + 8000, 2);
  });

  it("hourly 'both': charter and owner rows at rate × hours, rolled into each variable total", () => {
    const a = withCatalog(
      charter,
      [custom("li_satcom", { label: "Satcom", section: "variable", kind: "hourly", appliesTo: "both" })],
      { li_satcom: "45" }
    );
    const base = run(charter);
    const r = run(a);
    const ch = r.get("charter_li_satcom")!;
    const ow = r.get("owner_li_satcom")!;
    expect(ch.rate).toBe(45);
    expect(ch.annual).toBeCloseTo(-45 * ch.hours!, 2);
    expect(ow.annual).toBeCloseTo(-45 * ow.hours!, 2);
    expect(r.get("total_charter_variable")!.annual).toBeCloseTo(base.get("total_charter_variable")!.annual! + ch.annual!, 2);
    expect(r.get("total_owner_variable")!.annual).toBeCloseTo(base.get("total_owner_variable")!.annual! + ow.annual!, 2);
  });

  it("hourly 'owner' only emits an owner row; 'charter' only a charter row", () => {
    const own = run(withCatalog(charter, [custom("li_o", { section: "variable", kind: "hourly", appliesTo: "owner" })], { li_o: "10" }));
    expect(own.get("owner_li_o")).toBeTruthy();
    expect(own.get("charter_li_o")).toBeUndefined();
    const chr = run(withCatalog(charter, [custom("li_c", { section: "variable", kind: "hourly", appliesTo: "charter" })], { li_c: "10" }));
    expect(chr.get("charter_li_c")).toBeTruthy();
    expect(chr.get("owner_li_c")).toBeUndefined();
  });

  it("revenue (hourly): adds to total revenue on charter aircraft and is absent on owner-only", () => {
    const item = custom("li_cater", { label: "Catering", section: "revenue", kind: "hourly" });
    const base = run(charter);
    const r = run(withCatalog(charter, [item], { li_cater: "20" }));
    const row = r.get("li_cater")!;
    expect(row.layout).toBe("revenue");
    expect(row.annual).toBeCloseTo(20 * row.hours!, 2);
    expect(r.get("total_revenue")!.annual).toBeCloseTo(base.get("total_revenue")!.annual! + row.annual!, 2);
    expect(r.net).toBeCloseTo(base.net + row.annual!, 2);
    expect(run(withCatalog(ownerOnly, [item], { li_cater: "20" })).get("li_cater")).toBeUndefined();
  });

  it("an inactive built-in line drops out of the rows and the totals", () => {
    const base = run(charter);
    const catalog = DEFAULT_LINE_CATALOG.map((i) => (i.key === "cleaning" ? { ...i, active: false } : i));
    const r = run({ ...charter, [LINE_CATALOG_ASSUMPTION_KEY]: serializeLineCatalog(catalog) });
    expect(r.get("cleaning_pl")).toBeUndefined();
    expect(r.get("total_fixed_ownership")!.annual).toBeCloseTo(
      base.get("total_fixed_ownership")!.annual! - (base.get("cleaning_pl")?.annual ?? 0),
      2
    );
  });

  it("visibility: excluding a custom line zeroes it and recomputes totals; client Show-off hides the row only", () => {
    const a = withCatalog(charter, [custom("li_nav", { label: "Nav database" })], { li_nav: "8000" });
    const included = run(a);
    const excluded = run({ ...a, proforma_line_visibility: JSON.stringify({ li_nav: false }) });
    expect(excluded.get("li_nav")).toMatchObject({ annual: 0, hidden: true });
    expect(excluded.net).toBeCloseTo(included.net + 8000, 2);

    const config = parseUsageTypeConfig({ lines: { li_nav: { include: true, showClient: false } } });
    const catalog = resolveLineCatalog(a);
    const hidden = toClientHidden(config, catalog);
    expect(hidden).toContain("li_nav");
    const client = computeWorkspaceProFormaForClient({ ...a, proforma_client_hidden: JSON.stringify(hidden) });
    expect(client.statementRows.some((r) => r.key === "li_nav")).toBe(false);
    expect(client.statementRows.find((r) => r.key === "total_fixed_ownership")!.annual).toBeCloseTo(
      included.get("total_fixed_ownership")!.annual!,
      2
    );
  });

  it("usage type line groups include custom items under their section", () => {
    const catalog = normalizeLineCatalog([
      custom("li_nav", { label: "Nav database" }),
      custom("li_satcom", { label: "Satcom", section: "variable", kind: "hourly", appliesTo: "both" }),
    ]);
    const groups = usageTypeLineGroups(catalog);
    const keys = (id: string) => groups.find((g) => g.id === id)!.lines.map((l) => l.key);
    expect(keys("fixed")).toContain("li_nav");
    expect(keys("charter_variable")).toContain("charter_li_satcom");
    expect(keys("owner_variable")).toContain("owner_li_satcom");
  });
});
