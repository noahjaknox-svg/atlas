import { prisma } from "@/lib/db";
import type { AssumptionMap } from "@/lib/assumptions";
import { buildDefaultsFromReferences } from "@/lib/aircraft-defaults";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";
import { resolveValidWarehouseAircraftId } from "@/lib/resolve-warehouse-aircraft-id";
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

function buildDefaultsContext(
  assumptions: AssumptionMap,
  instance: {
    warehouseAircraftId: string | null;
    proposedHomeBaseIcao: string | null;
    fboName: string | null;
  } | null
): AssumptionMap {
  const ctx: AssumptionMap = { ...assumptions };
  if (instance?.warehouseAircraftId) {
    ctx.aircraft_master_id = instance.warehouseAircraftId;
  }
  if (instance?.proposedHomeBaseIcao) {
    ctx.home_airport_icao = instance.proposedHomeBaseIcao;
    ctx.proposed_home_base = instance.proposedHomeBaseIcao;
  }
  if (instance?.fboName) {
    ctx.fbo_name = instance.fboName;
  }
  return ctx;
}

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

  const ctx = buildDefaultsContext(params.assumptions, instance);

  let map: Record<string, string> = mergeEstimatedDefaults({});
  const usage = ctx.usage_type === "part_91_135" ? "part_91_135" : "part_91";

  const icao =
    ctx.home_airport_icao ||
    ctx.proposed_home_base ||
    instance?.proposedHomeBaseIcao ||
    null;

  const warehouseResolution = await resolveValidWarehouseAircraftId({
    instanceWarehouseId: instance?.warehouseAircraftId,
    assumptionMasterId: ctx.aircraft_master_id,
    manufacturer: ctx.aircraft_manufacturer ?? instance?.warehouseAircraft?.manufacturer,
    model: ctx.aircraft_model ?? instance?.warehouseAircraft?.model,
  });
  const warehouseAircraftId = warehouseResolution.id;

  if (warehouseAircraftId) {
    const refDefaults = await loadAircraftReferenceDefaults({
      warehouseAircraftId,
      airportIcao: icao,
      fboName: ctx.fbo_name ?? instance?.fboName,
    });
    map = { ...map, ...refDefaults };
  }

  let aircraft = instance?.warehouseAircraft ?? null;
  if (!aircraft && warehouseAircraftId) {
    aircraft = await prisma.warehouseAircraft.findUnique({
      where: { id: warehouseAircraftId },
    });
  }
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
    const existingVisibility = parseProFormaVisibility(ctx);
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

/** Resolve warehouse-backed defaults and merge with stored proposal assumptions. */
export async function resolveEffectiveAssumptionsForInstance(
  aircraftInstanceId: string,
  assumptions: AssumptionMap
): Promise<AssumptionMap> {
  const { buildEffectiveAssumptions, stripLegacyEstimatedHangar } = await import(
    "@/lib/resolve-effective-assumptions"
  );
  const cleaned = stripLegacyEstimatedHangar(assumptions);
  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId,
    assumptions: cleaned,
  });
  return buildEffectiveAssumptions(cleaned, defaults);
}
