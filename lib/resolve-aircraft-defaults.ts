import { prisma } from "@/lib/db";
import type { AssumptionMap } from "@/lib/assumptions";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";
import { resolveValidWarehouseAircraftId } from "@/lib/resolve-warehouse-aircraft-id";
import { normalizeAircraftProfileMode } from "@/lib/aircraft-profile-mode";
import {
  PROFORMA_VISIBILITY_KEY,
  parseProFormaVisibility,
  serializeProFormaVisibility,
} from "@/lib/proforma-line-visibility";
import {
  buildProFormaLineVisibilityFromWarehouse,
  parseWarehouseFieldVisibility,
} from "@/lib/warehouse-aircraft-proforma-visibility";
import { buildDefaultsFromReferences } from "@/lib/aircraft-defaults";

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

function mergeNonEmpty(target: Record<string, string>, patch: Record<string, string>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v?.trim()) target[k] = v.trim();
  }
}

/** Resolve Data Hub defaults for workspace Pulled/Default column (no synthetic fills). */
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
  const map: Record<string, string> = {};
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
    mergeNonEmpty(
      map,
      await loadAircraftReferenceDefaults({
        warehouseAircraftId,
        airportIcao: icao,
        fboName: ctx.fbo_name ?? instance?.fboName,
      })
    );
  }

  let aircraft = instance?.warehouseAircraft ?? null;
  if (!aircraft && warehouseAircraftId) {
    aircraft = await prisma.warehouseAircraft.findUnique({
      where: { id: warehouseAircraftId },
    });
  }

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
      if (v?.trim() && !map[k]?.trim()) map[k] = v.trim();
    }
  }

  if (icao) {
    map.home_airport_icao = icao.toUpperCase();
    map.proposed_home_base = icao.toUpperCase();
  }

  const profileMode = normalizeAircraftProfileMode({ ...ctx, ...map });
  if (profileMode === "general") {
    delete map.aircraft_year;
  }

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined && v.trim() !== "") out[k] = v;
  }
  return out;
}

/** Warehouse pro forma line visibility — applied at seed only, not on baseline resolve. */
export async function resolveWarehouseLineVisibilityDefaults(params: {
  aircraftInstanceId: string;
  assumptions: AssumptionMap;
}): Promise<string | undefined> {
  const instance = await prisma.aircraftInstance.findUnique({
    where: { id: params.aircraftInstanceId },
    include: { warehouseAircraft: true },
  });

  const ctx = buildDefaultsContext(params.assumptions, instance);
  const warehouseResolution = await resolveValidWarehouseAircraftId({
    instanceWarehouseId: instance?.warehouseAircraftId,
    assumptionMasterId: ctx.aircraft_master_id,
    manufacturer: ctx.aircraft_manufacturer ?? instance?.warehouseAircraft?.manufacturer,
    model: ctx.aircraft_model ?? instance?.warehouseAircraft?.model,
  });

  let aircraft = instance?.warehouseAircraft ?? null;
  if (!aircraft && warehouseResolution.id) {
    aircraft = await prisma.warehouseAircraft.findUnique({
      where: { id: warehouseResolution.id },
    });
  }
  if (!aircraft) return undefined;

  const fieldVisibility = parseWarehouseFieldVisibility(aircraft.proformaFieldVisibility);
  const lineVisibility = buildProFormaLineVisibilityFromWarehouse(fieldVisibility);
  const existingVisibility = parseProFormaVisibility(ctx);
  return serializeProFormaVisibility({
    ...lineVisibility,
    ...existingVisibility,
    insurance_pl: existingVisibility.insurance_pl ?? false,
    registration_pl: existingVisibility.registration_pl ?? false,
  });
}

/** Resolve warehouse-backed defaults and merge with stored proposal assumptions. */
export async function resolveEffectiveAssumptionsForInstance(
  aircraftInstanceId: string,
  assumptions: AssumptionMap
): Promise<AssumptionMap> {
  const { buildEffectiveAssumptions } = await import("@/lib/resolve-effective-assumptions");
  const { stripLegacyEstimatedHangar } = await import("@/lib/hangar-assumptions");
  const cleaned = stripLegacyEstimatedHangar(assumptions);
  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId,
    assumptions: cleaned,
  });
  return buildEffectiveAssumptions(cleaned, defaults);
}
