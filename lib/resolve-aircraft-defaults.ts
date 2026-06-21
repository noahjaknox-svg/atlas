import { prisma } from "@/lib/db";
import type { AssumptionMap } from "@/lib/assumptions";
import { buildDefaultsFromReferences } from "@/lib/aircraft-defaults";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";
import { computeDerivedAssumptions } from "@/lib/aircraft-calculated-fields";
import { mergeEstimatedDefaults } from "@/lib/aircraft-estimated-defaults";
import { DEFAULT_BLOCK_TO_FLIGHT_FACTOR } from "@/lib/proforma-utilization";
import {
  PROFORMA_VISIBILITY_KEY,
  parseProFormaVisibility,
  serializeProFormaVisibility,
} from "@/lib/proforma-line-visibility";
import {
  buildProFormaLineVisibilityFromWarehouse,
  parseWarehouseFieldVisibility,
} from "@/lib/warehouse-aircraft-proforma-visibility";

/** Resolve database-backed defaults for all tab fields on an aircraft instance. */
export async function resolveAircraftDefaults(params: {
  aircraftInstanceId: string;
  assumptions: AssumptionMap;
}): Promise<Record<string, string>> {
  const instance = await prisma.aircraftInstance.findUnique({
    where: { id: params.aircraftInstanceId },
    include: {
      warehouseAircraft: true,
      proposal: { select: { prospect: { select: { opportunityType: true } } } },
    },
  });

  let map: Record<string, string> = mergeEstimatedDefaults({});
  const usage =
    params.assumptions.usage_type === "part_91_135" ? "part_91_135" : "part_91";

  const icao =
    params.assumptions.home_airport_icao ||
    params.assumptions.proposed_home_base ||
    instance?.proposedHomeBaseIcao ||
    null;

  if (instance?.warehouseAircraftId) {
    const refDefaults = await loadAircraftReferenceDefaults({
      warehouseAircraftId: instance.warehouseAircraftId,
      airportIcao: icao,
      fboName: params.assumptions.fbo_name ?? instance.fboName,
    });
    map = { ...map, ...refDefaults };
  }

  const aircraft = instance?.warehouseAircraft;
  if (aircraft) {
    map.aircraft_manufacturer = aircraft.manufacturer ?? "";
    map.aircraft_model = aircraft.model ?? "";
    map.aircraft_master_id = aircraft.id;
    map.crew_model = map.crew_model ?? "full_time";
    map.owner_annual_hours = map.owner_annual_hours ?? "400";
    map.charter_block_to_flight_ratio =
      map.charter_block_to_flight_ratio ?? String(DEFAULT_BLOCK_TO_FLIGHT_FACTOR);
    const defaultAvailable = 100;
    map.charter_flight_hours = map.charter_flight_hours ?? String(defaultAvailable);
    map.charter_block_hours =
      map.charter_block_hours ??
      String(Math.round(defaultAvailable * DEFAULT_BLOCK_TO_FLIGHT_FACTOR));
    map.pilot_charter_incentive_per_hour = map.pilot_charter_incentive_per_hour ?? "113";
    map.insurance_mode = map.insurance_mode ?? "annual";
    map.fet_treatment = map.fet_treatment ?? "pass_through";
    map.charter_demand_confidence = map.charter_demand_confidence ?? "medium";
    map.financing_enabled = map.financing_enabled ?? "no";

    const fieldVisibility = parseWarehouseFieldVisibility(aircraft.proformaFieldVisibility);
    const lineVisibility = buildProFormaLineVisibilityFromWarehouse(fieldVisibility);
    const existingVisibility = parseProFormaVisibility(params.assumptions);
    map[PROFORMA_VISIBILITY_KEY] = serializeProFormaVisibility({
      ...existingVisibility,
      ...lineVisibility,
      insurance_pl: existingVisibility.insurance_pl ?? false,
      registration_pl: existingVisibility.registration_pl ?? false,
    });
  }

  if (icao) {
    map.home_airport_icao = icao.toUpperCase();
    map.proposed_home_base = icao.toUpperCase();
    map.hangar_source = map.hangar_source ?? "data_hub";
    map.fuel_source = map.fuel_source ?? "fbo_base";
  }

  map.home_fuel_pct = map.home_fuel_pct ?? "70";
  map.charter_payback_pct = map.charter_payback_pct ?? "75";
  map.fuel_surcharge = map.fuel_surcharge ?? "0";

  if (aircraft) {
    const bundle = buildDefaultsFromReferences({
      master: {
        id: aircraft.id,
        manufacturer: aircraft.manufacturer ?? "",
        model: aircraft.model ?? "",
        typicalFuelBurnGph:
          aircraft.fuelGallonsPerHour != null ? String(aircraft.fuelGallonsPerHour) : null,
        typicalCharterRate:
          aircraft.charterHourlyRate != null ? String(aircraft.charterHourlyRate) : null,
        maxRecommendedUtilization: null,
      },
      airport: null,
      fboId: null,
      usageType: usage,
    });
    for (const [k, v] of Object.entries(bundle)) {
      if (v && !map[k]) map[k] = v;
    }
  }

  map = mergeEstimatedDefaults(map);

  const merged = { ...map, ...computeDerivedAssumptions(map as AssumptionMap) };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}
