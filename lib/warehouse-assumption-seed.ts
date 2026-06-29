import type { AssumptionMap } from "@/lib/assumptions";
import { PROFORMA_SCENARIO_ASSUMPTION_KEYS } from "@/lib/proforma-scenario-assumptions";
export const WAREHOUSE_SNAPSHOT_KEYS = new Set([
  "square_footage",
  "hangar_cost_per_sqft",
  "hangar_monthly",
]);

/** @deprecated Use WAREHOUSE_SNAPSHOT_KEYS — kept for tests importing the old name. */
export const WAREHOUSE_PULLED_KEYS = new Set([
  ...Array.from(WAREHOUSE_SNAPSHOT_KEYS),
  "hangar_calculated_annual",
]);

import { workspaceKeysPreservedOnRefresh } from "@/lib/field-parity-manifest";

/** User-edited fields kept when manually refreshing warehouse data. */
export const WAREHOUSE_REFRESH_PRESERVE_KEYS = new Set([
  "hangar_annual",
  "tail_number",
  "serial_number",
  "aircraft_year",
  "aircraft_value",
  "aircraft_summary",
  "features_notes",
  "wifi_features",
  "typical_range",
  "typical_cruise_speed",
  "passenger_capacity",
  "range_at_max_passengers",
  "aircraft_category",
  "model_code",
  "crew_count",
  "default_owner_hours",
  "owner_annual_hours",
  "owner_expense_allocation_mode",
  "financing_scenario_mode",
  "financing_enabled",
  "down_payment_percent",
  "interest_rate",
  "term_months",
  "balloon_payment",
  "crew_notes",
  "proforma_line_visibility",
  "proforma_custom_fixed_costs",
  "proforma_aircraft_value",
  "proforma_financing_enabled",
  "proforma_down_payment_percent",
  "proforma_interest_rate",
  "proforma_term_months",
  "proforma_balloon_payment",
  ...Array.from(workspaceKeysPreservedOnRefresh()),
]);

/** Derived/read-only keys — never copied from warehouse API responses. */
const WAREHOUSE_SKIP_KEYS = new Set([
  "hangar_calculated_annual",
  "fuel_cost_per_hour",
  "variable_cost_per_hour",
  "blended_fuel_price",
  "loan_amount",
  "down_payment",
  "monthly_debt_service",
  "lead_pilot_crew_total",
  "pic_crew_total",
  "sic_crew_total",
  "cabin_crew_total",
  "crew_total",
  "lead_pilot_training_total",
  "crew_training_total",
  "pic_training_total",
  "sic_training_total",
]);

/** Copy warehouse defaults into proposal assumptions. */
export function applyWarehouseDefaults(
  assumptions: AssumptionMap,
  defaults: Record<string, string>,
  mode: "seed" | "refresh"
): AssumptionMap {
  const next = { ...assumptions };
  for (const [key, raw] of Object.entries(defaults)) {
    const value = raw?.trim();
    if (!value || WAREHOUSE_SKIP_KEYS.has(key)) continue;
    if (
      mode === "refresh" &&
      WAREHOUSE_REFRESH_PRESERVE_KEYS.has(key) &&
      assumptions[key]?.trim()
    ) {
      continue;
    }
    next[key] = value;
  }
  if (mode === "seed" && !next.financing_scenario_mode?.trim()) {
    next.financing_scenario_mode = "hide_default";
  }
  return next;
}

/** Baseline map for default/override UI — excludes derived keys. */
export function warehouseDefaultsBaseline(
  defaults: Record<string, string>
): Record<string, string> {
  const baseline: Record<string, string> = {};
  for (const [key, raw] of Object.entries(defaults)) {
    const value = raw?.trim();
    if (!value || WAREHOUSE_SKIP_KEYS.has(key)) continue;
    baseline[key] = value;
  }
  return baseline;
}
