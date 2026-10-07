import type { AircraftTypeField } from "@/lib/warehouse-aircraft-fields";
import type { CatalogLineItem } from "@/lib/line-item-catalog";
import { isCustomLineItemKey } from "@/lib/line-item-catalog";
import type { COST_OVERRIDE_LINES } from "@/lib/cost-overrides";

/** Aircraft type editor tabs. */
export const TYPE_SECTION_NAMES = [
  "General",
  "Performance",
  "Crew",
  "Annual Expenses",
  "Variable Expenses",
  "Revenue",
  "Marketplace",
  "AFM",
] as const;
export type TypeSection = (typeof TYPE_SECTION_NAMES)[number];

/** Old section names (bookmarks, links, tests) → where that content lives now. */
const LEGACY_SECTIONS: Record<string, TypeSection> = {
  "line items": "Annual Expenses",
  "operating costs": "Annual Expenses",
  "hourly rates": "Variable Expenses",
  fuel: "Performance",
  utilization: "Crew",
  finances: "Revenue",
  "empty legs": "Marketplace",
  "afm / performance": "AFM",
};

export function normalizeTypeSection(raw: string | null): TypeSection {
  if (!raw) return "General";
  const key = raw.trim().toLowerCase();
  const direct = TYPE_SECTION_NAMES.find((s) => s.toLowerCase() === key);
  return direct ?? LEGACY_SECTIONS[key] ?? "General";
}

/**
 * Where a pro forma line's value lives. Every line has exactly one home, so the
 * aircraft type editor shows the badge instead of asking for it twice:
 * - set_here:   a value on this aircraft type (a column, or a custom `li_*` item)
 * - company:    company-wide default; the type may override (overrideLine) or just inherit
 * - fbo:        comes from the FBO at the home base
 * - calculated: derived from other inputs (link to where they're edited)
 */
export type LineSource =
  | { kind: "set_here"; fieldKey?: AircraftTypeField["key"] }
  | {
      kind: "company";
      note: string;
      href: { tab: string; section?: string };
      overrideLine?: (typeof COST_OVERRIDE_LINES)[number]["line"];
    }
  | { kind: "fbo"; note: string; href: { tab: string } }
  | { kind: "calculated"; note: string; section?: TypeSection };

/** Built-in aircraft_type lines → the AircraftType column that holds their value. */
const FIELD_FOR_LINE: Record<string, AircraftTypeField["key"]> = {
  wifi: "wifiAnnual",
  subscriptions: "subscriptionsAnnual",
  cleaning: "cleaningAnnual",
  supplies: "suppliesAnnual",
  airport_fees: "airportFeesAnnual",
  parts: "partsProgram",
  engine: "engineProgram",
  apu: "apuProgram",
  airframe: "airframeProgram",
  inspection: "inspectionReserve",
  maintenance: "maintenanceReserve",
  trip: "tripExpenseHourly",
};

export function lineSource(item: CatalogLineItem): LineSource {
  if (item.source === "aircraft_type") {
    return isCustomLineItemKey(item.key)
      ? { kind: "set_here" }
      : { kind: "set_here", fieldKey: FIELD_FOR_LINE[item.key] };
  }
  switch (item.systemCalc) {
    case "management_fee":
      return { kind: "company", note: "Same for every aircraft unless overridden", href: { tab: "general", section: "core" }, overrideLine: "management_fee" };
    case "maintenance_management_fee":
      return { kind: "company", note: "Same for every aircraft unless overridden", href: { tab: "general", section: "core" }, overrideLine: "maintenance_management_fee" };
    case "insurance":
      return { kind: "company", note: "Same for every aircraft unless overridden", href: { tab: "insurance" }, overrideLine: "insurance" };
    case "registration":
      return { kind: "company", note: "Same for every aircraft unless overridden", href: { tab: "registration-taxes" }, overrideLine: "registration" };
    case "fet_refund":
      return { kind: "company", note: "Company default (FET refund $/gal)", href: { tab: "general", section: "core" } };
    case "hangar":
      return { kind: "fbo", note: "FBO $/sq ft × square footage (General), or the FBOs-tab override", href: { tab: "fbos" } };
    case "crew":
    case "crew_training":
      return { kind: "calculated", note: "From the Crew tab", section: "Crew" };
    case "pilot_charter_incentive":
      return { kind: "calculated", note: "Incentive $/hr × charter flight hours (Revenue tab)", section: "Revenue" };
    case "debt_service":
      return { kind: "calculated", note: "From the proposal's financing terms" };
    case "fuel":
      return { kind: "calculated", note: "Fuel burn (Performance) × FBO fuel price", section: "Performance" };
    case "charter_revenue":
      return { kind: "calculated", note: "Charter rate × hours × payback % (terms above)", section: "Revenue" };
    case "fuel_surcharge":
      return { kind: "calculated", note: "Fuel surcharge × charter flight hours (terms above)", section: "Revenue" };
    default:
      return { kind: "calculated", note: "Calculated" };
  }
}

/** Catalog section → the editor tab that lists it. */
export const SECTION_TAB: Record<CatalogLineItem["section"], Exclude<TypeSection, "AFM">> = {
  fixed: "Annual Expenses",
  variable: "Variable Expenses",
  revenue: "Revenue",
};
