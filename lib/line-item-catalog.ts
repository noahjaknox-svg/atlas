import type { AssumptionMap } from "@/lib/assumptions";
import { FET_FUEL_TAX_REFUND_LABEL } from "@/lib/fet-refund";

/**
 * Pro forma line items catalog (Data Warehouse → Line Items).
 *
 * Every statement line is a catalog entry:
 * - source "system": amount comes from an existing calculator (crew, hangar via FBO,
 *   insurance, fuel, charter revenue, …). Only label / order / active are editable.
 * - source "aircraft_type": a value entered per aircraft type (Data Warehouse →
 *   Aircraft types → Annual / Variable Expenses / Revenue tab), seeded into the proposal under `assumptionKey`
 *   and editable per proposal.
 *
 * The active catalog is copied onto each aircraft's assumptions
 * (`proforma_line_catalog`) when it's seeded/refreshed, so the engine stays pure
 * (it also runs in the browser and inside published snapshots). Proposals without
 * that assumption use DEFAULT_LINE_CATALOG — exactly the pre-catalog lines.
 */
export type LineItemSection = "revenue" | "fixed" | "variable";
export type LineItemKind = "annual" | "hourly";
export type LineItemAppliesTo = "owner" | "charter" | "both";

export type SystemCalcId =
  | "charter_revenue"
  | "fuel_surcharge"
  | "fet_refund"
  | "crew"
  | "crew_training"
  | "pilot_charter_incentive"
  | "management_fee"
  | "maintenance_management_fee"
  | "hangar"
  | "registration"
  | "insurance"
  | "debt_service"
  | "fuel";

export type CatalogLineItem = {
  /** Stable id. Built-ins use today's stems; custom items are `li_<slug>`. */
  key: string;
  label: string;
  section: LineItemSection;
  kind: LineItemKind;
  /** Hourly variable lines: which flight hours they apply to. */
  appliesTo?: LineItemAppliesTo;
  source: "system" | "aircraft_type";
  systemCalc?: SystemCalcId;
  /** Proposal assumption holding the value (aircraft_type items). */
  assumptionKey?: string;
  /** Older assumption names read when `assumptionKey` is empty/zero. */
  legacyAssumptionKeys?: string[];
  /** Statement row key for fixed/revenue lines (hourly rows are `<charter|owner>_<key>`). */
  rowKey?: string;
  /** Only emit the row when the amount is > 0 (still counted in totals). */
  hideWhenZero?: boolean;
  /** Only emit the row when charter is enabled. */
  charterOnly?: boolean;
  active: boolean;
  sortOrder: number;
};

export const LINE_CATALOG_ASSUMPTION_KEY = "proforma_line_catalog";
export const CUSTOM_LINE_ITEM_PREFIX = "li_";

const sys = (
  key: string,
  label: string,
  section: LineItemSection,
  kind: LineItemKind,
  systemCalc: SystemCalcId,
  extra: Partial<CatalogLineItem> = {}
): Omit<CatalogLineItem, "sortOrder"> => ({
  key,
  label,
  section,
  kind,
  source: "system",
  systemCalc,
  active: true,
  ...extra,
});

const ac = (
  key: string,
  label: string,
  section: LineItemSection,
  kind: LineItemKind,
  assumptionKey: string,
  extra: Partial<CatalogLineItem> = {}
): Omit<CatalogLineItem, "sortOrder"> => ({
  key,
  label,
  section,
  kind,
  source: "aircraft_type",
  assumptionKey,
  active: true,
  ...extra,
});

/** Today's pro forma lines, in statement order. Row keys must never change. */
export const DEFAULT_LINE_CATALOG: CatalogLineItem[] = [
  sys("charter_revenue", "Charter Revenue", "revenue", "hourly", "charter_revenue", { rowKey: "charter_revenue_block" }),
  sys("fuel_surcharge", "Fuel Surcharge", "revenue", "hourly", "fuel_surcharge", { rowKey: "fuel_surcharge" }),
  sys("fet_refund", FET_FUEL_TAX_REFUND_LABEL, "revenue", "hourly", "fet_refund", { rowKey: "fet_refund" }),

  sys("crew", "Crew Salaries & Benefits", "fixed", "annual", "crew", { rowKey: "crew_salaries" }),
  sys("crew_training", "Crew Training", "fixed", "annual", "crew_training", { rowKey: "crew_training_pl" }),
  sys("pilot_charter_incentive", "Pilot Charter Incentive", "fixed", "annual", "pilot_charter_incentive", {
    rowKey: "pilot_charter_incentive_pl",
    hideWhenZero: true,
    charterOnly: true,
  }),
  sys("management_fee", "Management Fee", "fixed", "annual", "management_fee", { rowKey: "management_fee_pl" }),
  sys("maintenance_management_fee", "Maintenance Management Fee", "fixed", "annual", "maintenance_management_fee", {
    rowKey: "maint_mgmt_fee_pl",
  }),
  sys("hangar", "Hangar", "fixed", "annual", "hangar", { rowKey: "hangar_pl" }),
  sys("registration", "Registration / Taxes", "fixed", "annual", "registration", { rowKey: "registration_pl" }),
  sys("insurance", "Insurance (Hull & Liability)", "fixed", "annual", "insurance", { rowKey: "insurance_pl" }),
  ac("wifi", "In-Flight Wi-Fi", "fixed", "annual", "wifi_annual", { rowKey: "wifi_pl", legacyAssumptionKeys: ["wifi_subscription"] }),
  ac("subscriptions", "Subscriptions", "fixed", "annual", "subscriptions_annual", { rowKey: "subscriptions_pl" }),
  ac("cleaning", "Cleaning", "fixed", "annual", "cleaning_annual", { rowKey: "cleaning_pl" }),
  ac("supplies", "Supplies", "fixed", "annual", "supplies_annual", { rowKey: "supplies_pl" }),
  ac("airport_fees", "Airport Fees", "fixed", "annual", "airport_fees_annual", { rowKey: "airport_fees_pl" }),
  sys("debt_service", "Debt service", "fixed", "annual", "debt_service", { rowKey: "financing_debt_pl", hideWhenZero: true }),

  sys("fuel", "Fuel", "variable", "hourly", "fuel", { appliesTo: "both" }),
  ac("parts", "Parts Programs", "variable", "hourly", "parts_program_rate", { appliesTo: "both" }),
  ac("engine", "Engine Programs", "variable", "hourly", "engine_program_rate", { appliesTo: "both" }),
  ac("apu", "APU Programs", "variable", "hourly", "apu_program_rate", { appliesTo: "both" }),
  ac("airframe", "Airframe Programs", "variable", "hourly", "airframe_program_rate", { appliesTo: "both" }),
  ac("inspection", "Inspection Reserve", "variable", "hourly", "inspection_reserve_rate", { appliesTo: "both" }),
  ac("maintenance", "Maintenance Reserve", "variable", "hourly", "maintenance_reserve_rate", { appliesTo: "both" }),
  ac("trip", "Owner Trip Expense", "variable", "hourly", "trip_expense_per_hour", { appliesTo: "owner" }),
].map((item, i) => ({ ...item, sortOrder: i + 1 }));

const BUILT_IN_KEYS = new Set(DEFAULT_LINE_CATALOG.map((i) => i.key));

export function isBuiltInLineItem(key: string): boolean {
  return BUILT_IN_KEYS.has(key);
}

export function isCustomLineItemKey(key: string): boolean {
  return key.startsWith(CUSTOM_LINE_ITEM_PREFIX);
}

/** `li_` + a slug of the label, e.g. "Satcom (Ku)" → "li_satcom_ku". */
export function customLineItemKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `${CUSTOM_LINE_ITEM_PREFIX}${slug || "item"}`;
}

/** Row key for a fixed or revenue line. */
export function lineRowKey(item: CatalogLineItem): string {
  return item.rowKey ?? item.key;
}

/** Row keys an item produces on the statement (hourly variable lines → charter_/owner_). */
export function lineRowKeys(item: CatalogLineItem): string[] {
  if (item.section !== "variable") return [lineRowKey(item)];
  const applies = item.appliesTo ?? "both";
  const keys: string[] = [];
  if (applies !== "owner") keys.push(`charter_${item.key}`);
  if (applies !== "charter") keys.push(`owner_${item.key}`);
  return keys;
}

function isValidItem(v: unknown): v is CatalogLineItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.key === "string" &&
    typeof o.label === "string" &&
    (o.section === "revenue" || o.section === "fixed" || o.section === "variable") &&
    (o.kind === "annual" || o.kind === "hourly") &&
    (o.source === "system" || o.source === "aircraft_type")
  );
}

/**
 * Merge a stored/DB catalog over the defaults: built-ins keep their calculation wiring
 * (only label / order / active / appliesTo-for-custom are taken from the stored copy),
 * custom items are appended. Built-ins missing from the stored copy stay active.
 */
export function normalizeLineCatalog(items: readonly unknown[]): CatalogLineItem[] {
  const byKey = new Map<string, CatalogLineItem>();
  for (const raw of items) if (isValidItem(raw)) byKey.set(raw.key, raw);

  const out: CatalogLineItem[] = DEFAULT_LINE_CATALOG.map((def) => {
    const stored = byKey.get(def.key);
    if (!stored) return def;
    return {
      ...def,
      label: stored.label?.trim() || def.label,
      active: stored.active !== false,
      sortOrder: typeof stored.sortOrder === "number" ? stored.sortOrder : def.sortOrder,
    };
  });
  for (const item of Array.from(byKey.values())) {
    if (BUILT_IN_KEYS.has(item.key) || !isCustomLineItemKey(item.key)) continue;
    out.push({
      key: item.key,
      label: item.label,
      section: item.section,
      kind: item.section === "fixed" ? "annual" : item.kind,
      appliesTo: item.section === "variable" ? item.appliesTo ?? "both" : undefined,
      source: "aircraft_type",
      assumptionKey: item.key,
      active: item.active !== false,
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 1000,
    });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The catalog an aircraft's pro forma uses (its stored copy, or today's defaults). */
export function resolveLineCatalog(assumptions: AssumptionMap): CatalogLineItem[] {
  const raw = assumptions[LINE_CATALOG_ASSUMPTION_KEY];
  if (!raw?.trim()) return DEFAULT_LINE_CATALOG;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeLineCatalog(parsed) : DEFAULT_LINE_CATALOG;
  } catch {
    return DEFAULT_LINE_CATALOG;
  }
}

export function serializeLineCatalog(items: readonly CatalogLineItem[]): string {
  return JSON.stringify(items);
}

/** Numeric value of an aircraft_type item on this aircraft (falls back to legacy keys). */
export function lineItemValue(item: CatalogLineItem, a: AssumptionMap): number {
  const read = (k: string) => {
    const n = parseFloat(a[k] ?? "");
    return Number.isFinite(n) ? n : 0;
  };
  const primary = item.assumptionKey ? read(item.assumptionKey) : 0;
  if (primary) return primary;
  for (const k of item.legacyAssumptionKeys ?? []) {
    const v = read(k);
    if (v) return v;
  }
  return primary;
}
