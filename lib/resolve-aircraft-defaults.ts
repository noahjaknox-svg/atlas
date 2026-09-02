import type { AircraftInstance, AircraftType, CompanySettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AssumptionMap } from "@/lib/assumptions";
import { getCompanySettings } from "@/lib/company-settings";
import { loadAircraftReferenceDefaults } from "@/lib/aircraft-reference-defaults";
import { resolveValidAircraftTypeId } from "@/lib/resolve-warehouse-aircraft-id";
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
    aircraftTypeId: string | null;
    proposedHomeBaseIcao: string | null;
    fboName: string | null;
  } | null
): AssumptionMap {
  const ctx: AssumptionMap = { ...assumptions };
  if (instance?.aircraftTypeId) {
    ctx.aircraft_master_id = instance.aircraftTypeId;
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

type InstanceForDefaults = Pick<
  AircraftInstance,
  "aircraftTypeId" | "proposedHomeBaseIcao" | "fboName"
> & { aircraftType: AircraftType | null };

/**
 * Data shared across a batch of aircraft (publish / snapshot build) so each
 * aircraft resolve skips the per-row lookups for rows the caller already holds.
 */
export type AircraftDefaultsSharedPreload = {
  companySettings?: CompanySettings;
  /** usage type name → charterEnabled, for every usage type row. */
  usageTypeCharterEnabled?: Map<string, boolean>;
};

export type AircraftDefaultsPreload = AircraftDefaultsSharedPreload & {
  /** Aircraft instance (with its warehouse type) already loaded by the caller. */
  instance?: InstanceForDefaults | null;
};

/** Load the batch-shared rows once (two queries) for many aircraft resolves. */
export async function loadAircraftDefaultsSharedPreload(): Promise<AircraftDefaultsSharedPreload> {
  const [companySettings, usageTypes] = await Promise.all([
    getCompanySettings(),
    prisma.usageType.findMany({ select: { name: true, charterEnabled: true } }),
  ]);
  return {
    companySettings,
    usageTypeCharterEnabled: new Map(usageTypes.map((u) => [u.name, u.charterEnabled])),
  };
}

async function resolveUsageCharterEnabled(
  usage: string,
  preload: AircraftDefaultsPreload | undefined
): Promise<boolean | undefined> {
  if (preload?.usageTypeCharterEnabled) {
    return preload.usageTypeCharterEnabled.get(usage);
  }
  const row = usage
    ? await prisma.usageType.findFirst({ where: { name: usage }, select: { charterEnabled: true } })
    : null;
  return row?.charterEnabled;
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
  preload?: AircraftDefaultsPreload;
}): Promise<Record<string, string>> {
  const preload = params.preload;
  const instance: InstanceForDefaults | null =
    preload?.instance !== undefined
      ? preload.instance
      : await prisma.aircraftInstance.findUnique({
          where: { id: params.aircraftInstanceId },
          include: { aircraftType: true },
        });

  const ctx = buildDefaultsContext(params.assumptions, instance);
  const map: Record<string, string> = {};
  const usage = ctx.usage_type?.trim() || "part_91";

  const icao =
    ctx.home_airport_icao ||
    ctx.proposed_home_base ||
    instance?.proposedHomeBaseIcao ||
    null;

  // The joined aircraftType row proves the instance's warehouse id is valid, so a
  // preloaded instance skips the existence round trip.
  const preloadedTypeId =
    preload?.instance && instance?.aircraftType && instance.aircraftTypeId === instance.aircraftType.id
      ? instance.aircraftType.id
      : null;

  const [charterEnabledRow, warehouseResolution] = await Promise.all([
    resolveUsageCharterEnabled(usage, preload),
    preloadedTypeId
      ? Promise.resolve({ id: preloadedTypeId })
      : resolveValidAircraftTypeId({
          instanceWarehouseId: instance?.aircraftTypeId,
          assumptionMasterId: ctx.aircraft_master_id,
          manufacturer: ctx.aircraft_manufacturer ?? instance?.aircraftType?.manufacturer,
          model: ctx.aircraft_model ?? instance?.aircraftType?.model,
        }),
  ]);
  const charterEnabled = charterEnabledRow ?? usage === "part_91_135";
  const aircraftTypeId = warehouseResolution.id;

  if (aircraftTypeId) {
    mergeNonEmpty(
      map,
      await loadAircraftReferenceDefaults({
        aircraftTypeId,
        airportIcao: icao,
        fboName: ctx.fbo_name ?? instance?.fboName,
        preload: {
          aircraft: instance?.aircraftType,
          companySettings: preload?.companySettings,
        },
      })
    );
  }

  let aircraft = instance?.aircraftType ?? null;
  if (!aircraft && aircraftTypeId) {
    aircraft = await prisma.aircraftType.findUnique({
      where: { id: aircraftTypeId },
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
      charterEnabled,
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
    include: { aircraftType: true },
  });

  const ctx = buildDefaultsContext(params.assumptions, instance);
  const warehouseResolution = await resolveValidAircraftTypeId({
    instanceWarehouseId: instance?.aircraftTypeId,
    assumptionMasterId: ctx.aircraft_master_id,
    manufacturer: ctx.aircraft_manufacturer ?? instance?.aircraftType?.manufacturer,
    model: ctx.aircraft_model ?? instance?.aircraftType?.model,
  });

  let aircraft = instance?.aircraftType ?? null;
  if (!aircraft && warehouseResolution.id) {
    aircraft = await prisma.aircraftType.findUnique({
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
  assumptions: AssumptionMap,
  preload?: AircraftDefaultsPreload
): Promise<AssumptionMap> {
  const { buildEffectiveAssumptions } = await import("@/lib/resolve-effective-assumptions");
  const { stripLegacyEstimatedHangar } = await import("@/lib/hangar-assumptions");
  const cleaned = stripLegacyEstimatedHangar(assumptions);
  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId,
    assumptions: cleaned,
    preload,
  });
  return buildEffectiveAssumptions(cleaned, defaults);
}
