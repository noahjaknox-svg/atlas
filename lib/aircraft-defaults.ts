import type { AssumptionMap } from "@/lib/assumptions";
import { CHARTER_ASSUMPTION_KEYS } from "@/lib/usage-type";

export type AircraftMasterDefaults = {
  id: string;
  manufacturer: string;
  model: string;
  typicalFuelBurnGph: string | null;
  typicalCharterRate: string | null;
  maxRecommendedUtilization: number | null;
};

export type AirportDefaults = {
  icao: string;
  airportName: string;
  fuelPrice?: string;
  hangarMonthly?: string;
  fbos: Array<{
    id: string;
    fboName: string;
    jetARetailPrice: string | null;
  }>;
};

export function buildDefaultsFromReferences(params: {
  master?: AircraftMasterDefaults | null;
  airport?: AirportDefaults | null;
  fboId?: string | null;
  usageType: string;
}): Partial<AssumptionMap> {
  const map: Partial<AssumptionMap> = {
    usage_type: params.usageType,
    operating_model:
      params.usageType === "part_91_135"
        ? "Part 91 plus Part 135 charter"
        : "Part 91 management only",
  };

  if (params.master) {
    map.aircraft_manufacturer = params.master.manufacturer;
    map.aircraft_model = params.master.model;
    map.aircraft_master_id = params.master.id;
    if (params.master.typicalFuelBurnGph) {
      map.fuel_burn_gph = params.master.typicalFuelBurnGph;
    }
    if (params.master.typicalCharterRate) {
      map.charter_rate = params.master.typicalCharterRate;
    }
    if (params.master.maxRecommendedUtilization) {
      map.max_annual_utilization = String(params.master.maxRecommendedUtilization);
    }
  }

  if (params.airport) {
    map.home_airport_icao = params.airport.icao;
    map.proposed_home_base = params.airport.icao;
    if (params.airport.fuelPrice) {
      map.home_fuel_price = params.airport.fuelPrice;
      map.away_fuel_price = params.airport.fuelPrice;
    }
    if (params.airport.hangarMonthly) {
      const monthly = parseFloat(params.airport.hangarMonthly);
      if (Number.isFinite(monthly) && monthly > 0) {
        map.hangar_annual = String(Math.round(monthly * 12));
      }
    }
    map.fuel_source = map.fuel_source ?? "fbo_retail";
    const fbo =
      params.fboId != null
        ? params.airport.fbos.find((f) => f.id === params.fboId)
        : params.airport.fbos[0];
    if (fbo) {
      map.fbo_name = fbo.fboName;
      if (fbo.jetARetailPrice) {
        map.home_fuel_price = fbo.jetARetailPrice;
      }
    }
  }

  if (params.usageType !== "part_91_135") {
    CHARTER_ASSUMPTION_KEYS.forEach((key) => {
      map[key] = "0";
    });
  }

  return map;
}
