import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";

/**
 * Resolve database-backed pro forma defaults for a warehouse aircraft, plus the
 * single CompanySettings row and (optionally) the FBO at the proposed home base.
 * Produces a flat assumption-key map consumed by the pro forma engine.
 */
export async function loadAircraftReferenceDefaults(params: {
  warehouseAircraftId: string;
  airportIcao?: string | null;
  fboName?: string | null;
}): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  const aircraft = await prisma.warehouseAircraft.findUnique({
    where: { id: params.warehouseAircraftId },
  });
  if (!aircraft) return map;

  const settings = await getCompanySettings();

  const set = (key: string, value: number | null | undefined) => {
    if (value == null) return;
    map[key] = String(value);
  };

  // Hourly rates
  set("fuel_burn_gph", aircraft.fuelGallonsPerHour);
  set("engine_program_rate", aircraft.engineProgram);
  set("apu_program_rate", aircraft.apuProgram);
  set("parts_program_rate", aircraft.partsProgram);
  set("inspection_reserve_rate", aircraft.inspectionReserve);
  set("trip_expense_per_hour", aircraft.tripExpenseHourly);

  // General / finances
  set("passenger_capacity", aircraft.passengerCapacity);
  set("square_footage", aircraft.squareFootage);
  set("aircraft_value", aircraft.averageCost);
  set("charter_rate", aircraft.charterHourlyRate);
  set("fuel_surcharge", aircraft.fuelSurcharge);
  set("pilot_charter_incentive_per_hour", aircraft.pilotCharterIncentive);
  if (aircraft.charterPaybackBasis) map.charter_payback_basis = aircraft.charterPaybackBasis;
  if (aircraft.fuelSurchargePaybackBasis) {
    map.fuel_surcharge_payback_basis = aircraft.fuelSurchargePaybackBasis;
  }

  // Crew — fully loaded salaries (base + benefits) become the fixed crew cost.
  const benefitsFraction = Number(settings.crewBenefitsPercent);
  const cabinCount = aircraft.cabinAttendantCount ?? 0;
  const cabinSalary = aircraft.cabinAttendantSalary ?? 0;
  const leadPilotCount = aircraft.leadPilotCount ?? 0;
  const picCount = aircraft.picCount ?? 0;
  const sicCount = aircraft.sicCount ?? 0;
  const baseCrewSalary =
    leadPilotCount * (aircraft.leadPilotSalary ?? 0) +
    picCount * (aircraft.picSalary ?? 0) +
    sicCount * (aircraft.sicSalary ?? 0) +
    cabinCount * cabinSalary;
  set("crew_total", Math.round(baseCrewSalary * (1 + benefitsFraction)));
  set("benefits_pct", benefitsFraction * 100);
  set("pic_salary", aircraft.picSalary);
  set("sic_salary", aircraft.sicSalary);
  set("pic_training", aircraft.picTrainingCost);
  set("sic_training", aircraft.sicTrainingCost);
  set("pic_count", leadPilotCount + picCount);
  set("sic_count", sicCount);
  map.crew_model = "full_time";

  // Max annual utilization keyed off total pilot headcount (1–6).
  const totalPilots = Math.min(
    6,
    Math.max(1, leadPilotCount + picCount + sicCount)
  );
  const usageByPilots = [
    aircraft.maxUsage1Pilot,
    aircraft.maxUsage2Pilots,
    aircraft.maxUsage3Pilots,
    aircraft.maxUsage4Pilots,
    aircraft.maxUsage5Pilots,
    aircraft.maxUsage6Pilots,
  ];
  const maxUsage = usageByPilots[totalPilots - 1];
  if (maxUsage != null) set("max_annual_utilization", maxUsage);

  // Company-wide defaults
  set("management_fee", settings.annualManagementFee);
  set("maintenance_management_fee", settings.annualMaintenanceManagementFee);
  set("charter_payback_pct", Number(settings.charterPaybackPercent));
  set("fuel_tax_refund", Number(settings.fuelTaxRefund));
  set("home_fuel_pct", aircraft.homeFuelPct);
  map.home_fuel_pct = map.home_fuel_pct ?? "70";

  // Insurance & Taxes tab is intentionally empty for now — zero + hidden.
  map.insurance_annual = "0";
  map.insurance_mode = "annual";
  map.registration_annual = "0";

  // Fuel + hangar from the FBO at the proposed home base, else company fallback.
  const usAverageFuel = Number(settings.usAverageFuelCost);
  set("away_fuel_price", usAverageFuel);
  map.home_fuel_price = String(usAverageFuel);
  map.fuel_source = "us_average";

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
        set("hangar_cost_per_sqft", Number(fboPick.hangarCostPerSqft));
      }

      const override = await prisma.fboHangarOverride.findUnique({
        where: {
          fboId_warehouseAircraftId: {
            fboId: fboPick.id,
            warehouseAircraftId: aircraft.id,
          },
        },
      });
      if (override) {
        set("hangar_annual", override.annualRate);
      } else if (fboPick.hangarCostPerSqft != null && aircraft.squareFootage != null) {
        set(
          "hangar_annual",
          Math.round(Number(fboPick.hangarCostPerSqft) * aircraft.squareFootage)
        );
      }
    }
  }

  return map;
}
