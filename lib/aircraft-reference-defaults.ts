import type { AircraftType, CompanySettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";
import { loadCompanySettingsDefaults } from "@/lib/company-settings-defaults";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";
import {
  loadAircraftTypeDefaults,
  stripExcludedWarehouseKeys,
} from "@/lib/warehouse-assumption-map";

/** Rows a batch caller (publish / snapshot build) has already loaded. */
export type AircraftReferencePreload = {
  /** Warehouse aircraft row matching `aircraftTypeId` — skips the lookup when present. */
  aircraft?: AircraftType | null;
  /** Company settings row — skips the lookup when present. */
  companySettings?: CompanySettings;
};

/**
 * Resolve database-backed defaults for a warehouse aircraft plus company settings
 * and (when ICAO is known) FBO fuel/hangar. Only non-null Data Hub values are included.
 */
export async function loadAircraftReferenceDefaults(params: {
  aircraftTypeId: string;
  airportIcao?: string | null;
  fboName?: string | null;
  preload?: AircraftReferencePreload;
}): Promise<Record<string, string>> {
  const preloadedAircraft =
    params.preload?.aircraft && params.preload.aircraft.id === params.aircraftTypeId
      ? params.preload.aircraft
      : null;
  const [aircraft, companySettings] = await Promise.all([
    preloadedAircraft ??
      prisma.aircraftType.findUnique({
        where: { id: params.aircraftTypeId },
      }),
    params.preload?.companySettings ?? getCompanySettings(),
  ]);
  if (!aircraft) return {};

  const map: Record<string, string> = {
    ...stripExcludedWarehouseKeys(loadAircraftTypeDefaults(aircraft)),
    ...loadCompanySettingsDefaults(companySettings),
  };

  const icao = params.airportIcao?.toUpperCase();
  if (icao) {
    const fbos = await findFbosAtAirport(icao);

    let fboPick = fbos[0] ?? null;
    const wantedFbo = params.fboName?.trim();
    if (wantedFbo) {
      fboPick =
        fbos.find((f) => f.fboName.toLowerCase() === wantedFbo.toLowerCase()) ?? fboPick;
    }

    if (fboPick) {
      map.fbo_name = fboPick.fboName;
      map.home_fuel_price = fboPick.baseFuelRate.toString();
      map.fuel_source = "fbo_base";
      if (fboPick.hangarCostPerSqft != null) {
        map.hangar_cost_per_sqft = String(Number(fboPick.hangarCostPerSqft));
      }

      const override = await prisma.fboHangarOverride.findUnique({
        where: {
          fboId_aircraftTypeId: {
            fboId: fboPick.id,
            aircraftTypeId: aircraft.id,
          },
        },
      });
      if (override?.annualRate != null) {
        map.hangar_annual = String(override.annualRate);
      } else if (fboPick.hangarCostPerSqft != null && aircraft.squareFootage != null) {
        map.hangar_annual = String(
          Math.round(Number(fboPick.hangarCostPerSqft) * aircraft.squareFootage)
        );
      }
    } else if (map.away_fuel_price) {
      map.home_fuel_price = map.away_fuel_price;
      map.fuel_source = "us_average";
    }
  }

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v?.trim()) out[k] = v.trim();
  }
  return out;
}
