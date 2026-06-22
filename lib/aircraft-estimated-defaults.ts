import type { AssumptionMap } from "@/lib/assumptions";
import { DEFAULT_BLOCK_TO_FLIGHT_FACTOR } from "@/lib/proforma-utilization";

/**
 * PrismJet internal estimates when data hub / master data has no value.
 * Merged under API defaults in resolveAircraftDefaults.
 */
export const ESTIMATED_DEFAULTS: Record<string, string> = {
  aircraft_year: "2018",
  aircraft_value: "8500000",
  value_source: "internal_estimate",
  passenger_capacity: "8",
  typical_range: "2100",
  typical_cruise_speed: "450",
  tail_number: "",
  serial_number: "",
  wifi_features: "Ka-band Wi-Fi",
  features_notes: "",
  aircraft_summary: "",

  crew_model: "full_time",
  pic_count: "1",
  sic_count: "1",
  crew_baseline_pic: "1",
  crew_baseline_sic: "1",
  crew_step_index: "0",
  lead_pilot_enabled: "no",
  lead_pilot_count: "0",
  lead_pilot_salary: "185000",
  max_usage_1_pilot: "0",
  max_usage_2_pilots: "450",
  max_usage_3_pilots: "600",
  max_usage_4_pilots: "700",
  max_usage_5_pilots: "800",
  max_usage_6_pilots: "900",
  cabin_attendant_count: "0",
  pic_salary: "185000",
  sic_salary: "95000",
  cabin_attendant_annual_cost: "0",
  benefits_pct: "16",
  pic_training: "12500",
  sic_training: "12500",
  crew_notes: "",

  proposed_home_base: "SDL",
  fbo_name: "PrismJet",
  home_fuel_price: "6.85",
  away_fuel_price: "7.25",
  home_fuel_pct: "70",
  fuel_source: "fbo_retail",

  default_owner_hours: "400",
  owner_annual_hours: "400",
  max_annual_utilization: "500",
  charter_block_to_flight_ratio: String(DEFAULT_BLOCK_TO_FLIGHT_FACTOR),
  charter_flight_hours: "100",
  charter_block_hours: String(Math.round(100 * DEFAULT_BLOCK_TO_FLIGHT_FACTOR)),
  fuel_burn_gph: "180",
  engine_program_rate: "850",
  apu_program_rate: "120",
  parts_program_rate: "350",
  airframe_program_rate: "200",
  inspection_reserve_rate: "275",
  maintenance_reserve_rate: "150",
  trip_expense_per_hour: "450",

  management_fee: "85000",
  maintenance_management_fee: "12000",
  insurance_mode: "annual",
  insurance_annual: "45000",
  insurance_premium_percent: "0.35",
  charter_rate: "6500",
  charter_payback_pct: "75",
  fuel_surcharge: "85",
  pilot_charter_incentive_per_hour: "113",
  fet_treatment: "pass_through",
  jet_fuel_tax_differential_per_gal: "0.175",
  broker_commission_allowance: "0",
  empty_leg_allowance: "0",
  charter_demand_confidence: "medium",
  financing_enabled: "no",
  loan_amount: "0",
  down_payment: "0",
  interest_rate: "6.5",
  term_months: "120",
  balloon_payment: "0",

  registration_tax_rate: "0.041",
  registration_annual: "3500",
  wifi_annual: "24000",
  subscriptions_annual: "8500",
  cleaning_annual: "12000",
  supplies_annual: "6000",
  airport_fees_annual: "4500",
};

export function mergeEstimatedDefaults(map: Record<string, string>): Record<string, string> {
  const out = { ...ESTIMATED_DEFAULTS, ...map };
  for (const [k, v] of Object.entries(ESTIMATED_DEFAULTS)) {
    if (!out[k]?.trim()) out[k] = v;
  }
  return out;
}

export function applyEstimatedDefaultsToAssumptions(
  assumptions: AssumptionMap,
  defaults: Record<string, string>
): AssumptionMap {
  const merged = mergeEstimatedDefaults(defaults);
  const next: AssumptionMap = { ...assumptions };
  for (const [key, def] of Object.entries(merged)) {
    if (!next[key]?.trim() && def.trim()) {
      next[key] = def;
    }
  }
  return next;
}
