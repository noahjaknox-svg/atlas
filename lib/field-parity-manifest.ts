/**
 * Single source of truth for Data Warehouse ↔ workspace assumption field pairs.
 * Drives seed, refresh preserve rules, and copy maps.
 */

import { PROFORMA_SCENARIO_ASSUMPTION_KEYS } from "@/lib/proforma-scenario-assumptions";

export type FieldParityPair = {
  /** Workspace proposal_assumptions key */
  workspaceKey: string;
  /** Prisma warehouse_aircraft column or company_settings column */
  warehouseSource: "warehouse_aircraft" | "company_settings" | "fbo";
  warehouseColumn: string;
  /** User override preserved on manual warehouse refresh */
  preserveOnRefresh?: boolean;
  /** Shown in workspace UI (aircraft-tab-fields) */
  workspaceUi?: boolean;
};

/** Warehouse aircraft columns copied to workspace assumptions. */
export const WAREHOUSE_AIRCRAFT_PARITY: FieldParityPair[] = [
  { workspaceKey: "aircraft_manufacturer", warehouseSource: "warehouse_aircraft", warehouseColumn: "manufacturer" },
  { workspaceKey: "aircraft_model", warehouseSource: "warehouse_aircraft", warehouseColumn: "model" },
  { workspaceKey: "model_code", warehouseSource: "warehouse_aircraft", warehouseColumn: "modelCode", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "aircraft_category", warehouseSource: "warehouse_aircraft", warehouseColumn: "aircraftCategory", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "passenger_capacity", warehouseSource: "warehouse_aircraft", warehouseColumn: "passengerCapacity", preserveOnRefresh: true },
  { workspaceKey: "typical_range", warehouseSource: "warehouse_aircraft", warehouseColumn: "emptyRange", preserveOnRefresh: true },
  { workspaceKey: "range_at_max_passengers", warehouseSource: "warehouse_aircraft", warehouseColumn: "rangeAtMaxPassengers", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "crew_count", warehouseSource: "warehouse_aircraft", warehouseColumn: "crewCount", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "square_footage", warehouseSource: "warehouse_aircraft", warehouseColumn: "squareFootage" },
  { workspaceKey: "typical_cruise_speed", warehouseSource: "warehouse_aircraft", warehouseColumn: "averageCruiseSpeed", preserveOnRefresh: true },
  { workspaceKey: "wifi_features", warehouseSource: "warehouse_aircraft", warehouseColumn: "wifi", preserveOnRefresh: true },
  { workspaceKey: "home_fuel_pct", warehouseSource: "warehouse_aircraft", warehouseColumn: "homeFuelPct" },
  { workspaceKey: "fuel_burn_gph", warehouseSource: "warehouse_aircraft", warehouseColumn: "fuelGallonsPerHour" },
  { workspaceKey: "parts_program_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "partsProgram" },
  { workspaceKey: "engine_program_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "engineProgram" },
  { workspaceKey: "apu_program_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "apuProgram" },
  { workspaceKey: "airframe_program_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "airframeProgram", workspaceUi: true },
  { workspaceKey: "inspection_reserve_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "inspectionReserve" },
  { workspaceKey: "maintenance_reserve_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "maintenanceReserve", workspaceUi: true },
  { workspaceKey: "trip_expense_per_hour", warehouseSource: "warehouse_aircraft", warehouseColumn: "tripExpenseHourly" },
  { workspaceKey: "default_minimum_crew", warehouseSource: "warehouse_aircraft", warehouseColumn: "defaultMinimumCrew" },
  { workspaceKey: "lead_pilot_salary", warehouseSource: "warehouse_aircraft", warehouseColumn: "leadPilotSalary" },
  { workspaceKey: "lead_pilot_training", warehouseSource: "warehouse_aircraft", warehouseColumn: "leadPilotTrainingCost" },
  { workspaceKey: "pic_salary", warehouseSource: "warehouse_aircraft", warehouseColumn: "picSalary" },
  { workspaceKey: "pic_training", warehouseSource: "warehouse_aircraft", warehouseColumn: "picTrainingCost" },
  { workspaceKey: "sic_salary", warehouseSource: "warehouse_aircraft", warehouseColumn: "sicSalary" },
  { workspaceKey: "sic_training", warehouseSource: "warehouse_aircraft", warehouseColumn: "sicTrainingCost" },
  { workspaceKey: "cabin_attendant_annual_cost", warehouseSource: "warehouse_aircraft", warehouseColumn: "cabinAttendantSalary" },
  { workspaceKey: "cabin_attendant_count", warehouseSource: "warehouse_aircraft", warehouseColumn: "defaultCabinAttendantCount", workspaceUi: true },
  { workspaceKey: "max_usage_1_pilot", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage1Pilot" },
  { workspaceKey: "max_usage_2_pilots", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage2Pilots" },
  { workspaceKey: "max_usage_3_pilots", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage3Pilots" },
  { workspaceKey: "max_usage_4_pilots", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage4Pilots" },
  { workspaceKey: "max_usage_5_pilots", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage5Pilots" },
  { workspaceKey: "max_usage_6_pilots", warehouseSource: "warehouse_aircraft", warehouseColumn: "maxUsage6Pilots" },
  { workspaceKey: "aircraft_value", warehouseSource: "warehouse_aircraft", warehouseColumn: "averageCost", preserveOnRefresh: true },
  { workspaceKey: "charter_rate", warehouseSource: "warehouse_aircraft", warehouseColumn: "charterHourlyRate" },
  { workspaceKey: "charter_payback_basis", warehouseSource: "warehouse_aircraft", warehouseColumn: "charterPaybackBasis", workspaceUi: true },
  { workspaceKey: "fuel_surcharge_payback_basis", warehouseSource: "warehouse_aircraft", warehouseColumn: "fuelSurchargePaybackBasis", workspaceUi: true },
  { workspaceKey: "fuel_surcharge", warehouseSource: "warehouse_aircraft", warehouseColumn: "fuelSurcharge" },
  { workspaceKey: "pilot_charter_incentive_per_hour", warehouseSource: "warehouse_aircraft", warehouseColumn: "pilotCharterIncentive" },
  { workspaceKey: "wifi_annual", warehouseSource: "warehouse_aircraft", warehouseColumn: "wifiAnnual", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "subscriptions_annual", warehouseSource: "warehouse_aircraft", warehouseColumn: "subscriptionsAnnual", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "cleaning_annual", warehouseSource: "warehouse_aircraft", warehouseColumn: "cleaningAnnual", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "supplies_annual", warehouseSource: "warehouse_aircraft", warehouseColumn: "suppliesAnnual", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "airport_fees_annual", warehouseSource: "warehouse_aircraft", warehouseColumn: "airportFeesAnnual", workspaceUi: true, preserveOnRefresh: true },
];

/** Company settings copied to workspace assumptions. */
export const COMPANY_SETTINGS_PARITY: FieldParityPair[] = [
  { workspaceKey: "management_fee", warehouseSource: "company_settings", warehouseColumn: "annualManagementFee" },
  { workspaceKey: "maintenance_management_fee", warehouseSource: "company_settings", warehouseColumn: "annualMaintenanceManagementFee" },
  { workspaceKey: "charter_payback_pct", warehouseSource: "company_settings", warehouseColumn: "charterPaybackPercent" },
  { workspaceKey: "benefits_pct", warehouseSource: "company_settings", warehouseColumn: "crewBenefitsPercent" },
  { workspaceKey: "jet_fuel_tax_differential_per_gal", warehouseSource: "company_settings", warehouseColumn: "fuelTaxRefund" },
  { workspaceKey: "away_fuel_price", warehouseSource: "company_settings", warehouseColumn: "usAverageFuelCost" },
  { workspaceKey: "insurance_mode", warehouseSource: "company_settings", warehouseColumn: "defaultInsuranceMode", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "insurance_annual", warehouseSource: "company_settings", warehouseColumn: "defaultInsuranceAnnual", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "insurance_premium_percent", warehouseSource: "company_settings", warehouseColumn: "defaultInsurancePremiumPercent", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "registration_tax_rate", warehouseSource: "company_settings", warehouseColumn: "defaultRegistrationTaxRate", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "down_payment_percent", warehouseSource: "company_settings", warehouseColumn: "defaultDownPaymentPercent", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "interest_rate", warehouseSource: "company_settings", warehouseColumn: "defaultInterestRate", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "term_months", warehouseSource: "company_settings", warehouseColumn: "defaultTermMonths", workspaceUi: true, preserveOnRefresh: true },
  { workspaceKey: "balloon_payment", warehouseSource: "company_settings", warehouseColumn: "defaultBalloonPayment", workspaceUi: true, preserveOnRefresh: true },
];

/** Workspace-only keys — no warehouse column; defaults live in code or UI. */
export const WORKSPACE_ONLY_ASSUMPTION_KEYS = new Set([
  "fet_treatment",
]);

/** Demo pro forma scenario keys — overlay configurator baseline at read time. */
export const PROFORMA_SCENARIO_KEYS = [...PROFORMA_SCENARIO_ASSUMPTION_KEYS] as const;

/** Keys intentionally without warehouse counterparts (instance/proposal-specific). */
export const FIELD_PARITY_EXCEPTIONS = new Set([
  "tail_number",
  "serial_number",
  "aircraft_year",
  "aircraft_profile_mode",
  "owner_annual_hours",
  "owner_proforma_hours_json",
  ...PROFORMA_SCENARIO_KEYS,
  "fet_treatment",
  "charter_block_hours",
  "charter_flight_hours",
  "crew_step_index",
  "lead_pilot_enabled",
  "pic_count",
  "sic_count",
  "proforma_line_visibility",
  "proforma_custom_fixed_costs",
  "financing_scenario_mode",
  "financing_enabled",
  "loan_amount",
  "down_payment",
  "monthly_debt_service",
  "hangar_annual",
  "registration_annual",
  "fuel_source",
  "opportunity_type",
]);

export function workspaceKeysPreservedOnRefresh(): Set<string> {
  const keys = new Set<string>();
  for (const pair of [...WAREHOUSE_AIRCRAFT_PARITY, ...COMPANY_SETTINGS_PARITY]) {
    if (pair.preserveOnRefresh) keys.add(pair.workspaceKey);
  }
  return keys;
}
