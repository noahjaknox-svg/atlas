import type { WarehouseAircraft } from "@prisma/client";

type WarehouseRow = Pick<
  WarehouseAircraft,
  | "manufacturer"
  | "model"
  | "modelCode"
  | "aircraftCategory"
  | "passengerCapacity"
  | "emptyRange"
  | "rangeAtMaxPassengers"
  | "crewCount"
  | "squareFootage"
  | "averageCruiseSpeed"
  | "wifi"
  | "homeFuelPct"
  | "fuelGallonsPerHour"
  | "partsProgram"
  | "engineProgram"
  | "apuProgram"
  | "airframeProgram"
  | "inspectionReserve"
  | "maintenanceReserve"
  | "tripExpenseHourly"
  | "defaultMinimumCrew"
  | "defaultCabinAttendantCount"
  | "leadPilotSalary"
  | "leadPilotTrainingCost"
  | "picSalary"
  | "sicSalary"
  | "cabinAttendantSalary"
  | "picTrainingCost"
  | "sicTrainingCost"
  | "maxUsage1Pilot"
  | "maxUsage2Pilots"
  | "maxUsage3Pilots"
  | "maxUsage4Pilots"
  | "maxUsage5Pilots"
  | "maxUsage6Pilots"
  | "averageCost"
  | "charterHourlyRate"
  | "charterPaybackBasis"
  | "fuelSurchargePaybackBasis"
  | "fuelSurcharge"
  | "pilotCharterIncentive"
  | "wifiAnnual"
  | "subscriptionsAnnual"
  | "cleaningAnnual"
  | "suppliesAnnual"
  | "airportFeesAnnual"
>;

function setInt(
  map: Record<string, string>,
  key: string,
  value: number | null | undefined
) {
  if (value == null) return;
  map[key] = String(value);
}

/** Warehouse int fields that show 0 in Pulled when unset in Data Hub. */
function setIntOrZero(
  map: Record<string, string>,
  key: string,
  value: number | null | undefined
) {
  map[key] = value != null && Number.isFinite(value) ? String(value) : "0";
}

function setStr(
  map: Record<string, string>,
  key: string,
  value: string | null | undefined
) {
  if (value == null || value.trim() === "") return;
  map[key] = value.trim();
}

/** Map warehouse aircraft row → workspace assumption keys (only non-null values). */
export function loadWarehouseAircraftDefaults(
  aircraft: WarehouseRow & { id: string }
): Record<string, string> {
  const map: Record<string, string> = {};

  setStr(map, "aircraft_manufacturer", aircraft.manufacturer);
  setStr(map, "aircraft_model", aircraft.model);
  setStr(map, "model_code", aircraft.modelCode);
  if (aircraft.aircraftCategory) {
    map.aircraft_category = aircraft.aircraftCategory;
  }
  map.aircraft_master_id = aircraft.id;

  setInt(map, "passenger_capacity", aircraft.passengerCapacity);
  setInt(map, "typical_range", aircraft.emptyRange);
  setInt(map, "range_at_max_passengers", aircraft.rangeAtMaxPassengers);
  setInt(map, "crew_count", aircraft.crewCount);
  setInt(map, "square_footage", aircraft.squareFootage);
  setInt(map, "typical_cruise_speed", aircraft.averageCruiseSpeed);
  if (aircraft.wifi != null) {
    map.wifi_features = aircraft.wifi ? "Yes" : "No";
  }
  setInt(map, "home_fuel_pct", aircraft.homeFuelPct);

  setInt(map, "fuel_burn_gph", aircraft.fuelGallonsPerHour);
  setInt(map, "parts_program_rate", aircraft.partsProgram);
  setInt(map, "engine_program_rate", aircraft.engineProgram);
  setInt(map, "apu_program_rate", aircraft.apuProgram);
  setInt(map, "airframe_program_rate", aircraft.airframeProgram);
  setInt(map, "inspection_reserve_rate", aircraft.inspectionReserve);
  setInt(map, "maintenance_reserve_rate", aircraft.maintenanceReserve);
  setInt(map, "trip_expense_per_hour", aircraft.tripExpenseHourly);

  setIntOrZero(map, "default_minimum_crew", aircraft.defaultMinimumCrew);
  setInt(map, "lead_pilot_salary", aircraft.leadPilotSalary);
  setIntOrZero(map, "lead_pilot_training", aircraft.leadPilotTrainingCost);
  setInt(map, "pic_salary", aircraft.picSalary);
  setInt(map, "sic_salary", aircraft.sicSalary);
  setInt(map, "cabin_attendant_annual_cost", aircraft.cabinAttendantSalary);
  setIntOrZero(map, "cabin_attendant_count", aircraft.defaultCabinAttendantCount);
  setInt(map, "pic_training", aircraft.picTrainingCost);
  setInt(map, "sic_training", aircraft.sicTrainingCost);

  setInt(map, "max_usage_1_pilot", aircraft.maxUsage1Pilot);
  setInt(map, "max_usage_2_pilots", aircraft.maxUsage2Pilots);
  setInt(map, "max_usage_3_pilots", aircraft.maxUsage3Pilots);
  setInt(map, "max_usage_4_pilots", aircraft.maxUsage4Pilots);
  setInt(map, "max_usage_5_pilots", aircraft.maxUsage5Pilots);
  setInt(map, "max_usage_6_pilots", aircraft.maxUsage6Pilots);

  setInt(map, "aircraft_value", aircraft.averageCost);
  setInt(map, "charter_rate", aircraft.charterHourlyRate);
  setInt(map, "fuel_surcharge", aircraft.fuelSurcharge);
  setInt(map, "pilot_charter_incentive_per_hour", aircraft.pilotCharterIncentive);
  setInt(map, "wifi_annual", aircraft.wifiAnnual);
  setInt(map, "subscriptions_annual", aircraft.subscriptionsAnnual);
  setInt(map, "cleaning_annual", aircraft.cleaningAnnual);
  setInt(map, "supplies_annual", aircraft.suppliesAnnual);
  setInt(map, "airport_fees_annual", aircraft.airportFeesAnnual);

  if (aircraft.charterPaybackBasis) {
    map.charter_payback_basis = aircraft.charterPaybackBasis;
  }
  if (aircraft.fuelSurchargePaybackBasis) {
    map.fuel_surcharge_payback_basis = aircraft.fuelSurchargePaybackBasis;
  }

  return map;
}

/** Keys that must never come from warehouse defaults (proposal / profile specific). */
export const WAREHOUSE_EXCLUDED_ASSUMPTION_KEYS = new Set([
  "aircraft_year",
  "tail_number",
  "serial_number",
  "aircraft_profile_mode",
]);

export function stripExcludedWarehouseKeys(
  map: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (WAREHOUSE_EXCLUDED_ASSUMPTION_KEYS.has(k)) continue;
    if (v?.trim()) out[k] = v;
  }
  return out;
}
