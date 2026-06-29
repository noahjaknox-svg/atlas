import { formatCurrency } from "@/lib/utils";

/** Human-readable labels for scenario template / assumption keys. */
export const ASSUMPTION_KEY_LABELS: Record<string, string> = {
  pic_salary: "PIC salary",
  sic_salary: "SIC salary",
  management_fee: "Management fee",
  maintenance_management_fee: "Maintenance management fee",
  owner_annual_hours: "Owner annual hours",
  ownership_percent: "Ownership %",
  proposed_home_base: "Home base",
  crew_model: "Crew model",
  crew_total: "Crew total",
  pic_count: "PIC count",
  sic_count: "SIC count",
  financing_enabled: "Financing enabled",
  financing_scenario_mode: "Financing on pro forma",
  down_payment_percent: "Down payment (%)",
  interest_rate: "Interest rate (%)",
  term_months: "Term (months)",
  balloon_payment: "Balloon payment ($)",
  operator_notes: "Operator notes",
  aircraft_value: "Average cost (warehouse)",
  charter_rate: "Charter rate (block)",
  charter_payback_pct: "Charter payback %",
  fuel_surcharge: "Fuel surcharge ($/hr)",
  home_fuel_price: "Home fuel price ($/gal)",
  away_fuel_price: "Away fuel price ($/gal)",
  home_fuel_pct: "% fuel at home",
  fuel_burn_gph: "Fuel burn (GPH)",
  variable_cost_per_hour: "Variable cost per hour",
  parts_program_rate: "Parts program ($/hr)",
  engine_program_rate: "Engine program ($/hr)",
  apu_program_rate: "APU program ($/hr)",
  airframe_program_rate: "Airframe program ($/hr)",
  inspection_reserve_rate: "Inspection reserve ($/hr)",
  maintenance_reserve_rate: "Maintenance reserve ($/hr)",
  trip_expense_per_hour: "Trip expense ($/hr)",
  insurance_annual: "Insurance (annual)",
  insurance_premium_percent: "Insurance premium %",
  insurance_mode: "Insurance mode",
  hangar_annual: "Hangar (annual)",
  wifi_annual: "In-flight Wi-Fi (annual)",
  subscriptions_annual: "Subscriptions (annual)",
  cleaning_annual: "Cleaning (annual)",
  supplies_annual: "Supplies (annual)",
  airport_fees_annual: "Airport fees (annual)",
  usage_type: "Usage type",
};

export function assumptionKeyLabel(key: string): string {
  return ASSUMPTION_KEY_LABELS[key] ?? key.replace(/_/g, " ");
}

const MONEY_KEYS = new Set([
  "pic_salary",
  "sic_salary",
  "management_fee",
  "maintenance_management_fee",
  "insurance_annual",
  "crew_total",
  "aircraft_value",
  "hangar_annual",
  "wifi_annual",
  "subscriptions_annual",
  "cleaning_annual",
  "supplies_annual",
  "airport_fees_annual",
]);

export function formatAssumptionValue(key: string, value: string): string {
  const n = parseFloat(value);
  if (MONEY_KEYS.has(key) && Number.isFinite(n)) {
    return formatCurrency(n);
  }
  return value;
}

export function formatAssumptionsSummary(
  assumptions: Array<{ assumptionKey: string; value: string }> | undefined
): string {
  if (!assumptions?.length) return "—";
  return assumptions
    .map(
      (a) =>
        `${assumptionKeyLabel(a.assumptionKey)}: ${formatAssumptionValue(a.assumptionKey, a.value)}`
    )
    .join(" · ");
}
