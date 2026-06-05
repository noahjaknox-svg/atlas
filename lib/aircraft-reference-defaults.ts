import { prisma } from "@/lib/db";
import { resolveHangarCostFromRows } from "@/lib/resolve-hangar-cost";

const PROGRAM_KEY_MAP: Record<string, string> = {
  engine: "engine_program_rate",
  apu: "apu_program_rate",
  parts: "parts_program_rate",
  other: "inspection_reserve_rate",
  airframe: "maintenance_reserve_rate",
};

const OPERATING_KEY_MAP: Record<string, string> = {
  wifi_annual: "wifi_annual",
  subscriptions_annual: "subscriptions_annual",
  cleaning_annual: "cleaning_annual",
  supplies_annual: "supplies_annual",
  management_fee: "management_fee",
  maintenance_management_fee: "maintenance_management_fee",
};

function applyMasterFields(
  map: Record<string, string>,
  master: NonNullable<Awaited<ReturnType<typeof prisma.aircraftMaster.findUnique>>>
) {
  if (master.typicalFuelBurnGph) {
    map.fuel_burn_gph = master.typicalFuelBurnGph.toString();
  }
  if (master.typicalCharterRate) {
    map.charter_rate = master.typicalCharterRate.toString();
  }
  if (master.maxRecommendedUtilization) {
    map.max_annual_utilization = String(master.maxRecommendedUtilization);
  }
  if (master.typicalHullValue) {
    map.aircraft_value = master.typicalHullValue.toString();
  }
  if (master.typicalPassengerCapacity) {
    map.passenger_capacity = String(master.typicalPassengerCapacity);
  }
  if (master.typicalRangeNm) map.typical_range = String(master.typicalRangeNm);
  if (master.typicalCruiseSpeedKtas) {
    map.typical_cruise_speed = String(master.typicalCruiseSpeedKtas);
  }
}

function applyCrewRates(
  map: Record<string, string>,
  crewRates: Awaited<ReturnType<typeof prisma.crewRate.findMany>>
) {
  for (const rate of crewRates) {
    if (rate.role === "pic" && rate.salaryBase && !map.pic_salary) {
      map.pic_salary = rate.salaryBase.toString();
      if (rate.benefitsPercent) map.benefits_pct = rate.benefitsPercent.toString();
    }
    if (rate.role === "sic" && rate.salaryBase && !map.sic_salary) {
      map.sic_salary = rate.salaryBase.toString();
    }
  }
}

function applyTrainingCosts(
  map: Record<string, string>,
  trainingCosts: Awaited<ReturnType<typeof prisma.trainingCost.findMany>>
) {
  for (const t of trainingCosts) {
    if (t.role === "pic" && t.annualCost && !map.pic_training) {
      map.pic_training = t.annualCost.toString();
    }
    if (t.role === "sic" && t.annualCost && !map.sic_training) {
      map.sic_training = t.annualCost.toString();
    }
  }
}

function applyPrograms(
  map: Record<string, string>,
  programs: Awaited<ReturnType<typeof prisma.programCost.findMany>>
) {
  const seenPrograms = new Set<string>();
  for (const p of programs) {
    if (p.provider === "inspection_reserve" && p.hourlyRate != null) {
      map.inspection_reserve_rate = p.hourlyRate.toString();
      continue;
    }
    if (p.provider === "trip_expense" && p.hourlyRate != null) {
      map.trip_expense_per_hour = p.hourlyRate.toString();
      continue;
    }
    if (p.provider === "maintenance_reserve" && p.hourlyRate != null) {
      map.maintenance_reserve_rate = p.hourlyRate.toString();
      continue;
    }
    const key = PROGRAM_KEY_MAP[p.programType];
    if (!key || seenPrograms.has(key)) continue;
    if (p.hourlyRate != null) {
      map[key] = p.hourlyRate.toString();
      seenPrograms.add(key);
    }
  }
}

function applyOperating(
  map: Record<string, string>,
  operating: Awaited<ReturnType<typeof prisma.aircraftOperatingDefault.findMany>>
) {
  const seenOps = new Set<string>();
  for (const op of operating) {
    const key = OPERATING_KEY_MAP[op.costKey] ?? op.costKey;
    if (seenOps.has(key)) continue;
    map[key] = op.annualAmount.toString();
    seenOps.add(key);
  }
}

function applyCharterRate(
  map: Record<string, string>,
  charterRate: Awaited<ReturnType<typeof prisma.charterMarketRate.findFirst>>
) {
  if (!charterRate) return;
  if (charterRate.retailRateBase) {
    map.charter_rate = charterRate.retailRateBase.toString();
  }
  if (charterRate.fuelSurcharge != null) {
    map.fuel_surcharge = charterRate.fuelSurcharge.toString();
  }
  if (charterRate.ownerPaybackPercent != null) {
    map.charter_payback_pct = charterRate.ownerPaybackPercent.toString();
  }
}

/** Load database-backed defaults for an aircraft master + optional location. */
export async function loadAircraftReferenceDefaults(params: {
  aircraftMasterId: string;
  airportIcao?: string | null;
  fboName?: string | null;
}): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  const master = await prisma.aircraftMaster.findUnique({
    where: { id: params.aircraftMasterId },
  });
  if (!master) return map;

  applyMasterFields(map, master);

  const [crewRates, trainingCosts, programs, insurance, operating, charterRate] =
    await Promise.all([
      prisma.crewRate.findMany({
        where: { aircraftMasterId: params.aircraftMasterId },
        orderBy: { effectiveDate: "desc" },
        take: 4,
      }),
      prisma.trainingCost.findMany({
        where: { aircraftMasterId: params.aircraftMasterId, trainingType: "recurrent" },
        orderBy: { effectiveDate: "desc" },
      }),
      prisma.programCost.findMany({
        where: { aircraftMasterId: params.aircraftMasterId },
        orderBy: { effectiveDate: "desc" },
      }),
      prisma.insuranceAssumption.findFirst({
        where: { aircraftMasterId: params.aircraftMasterId },
        orderBy: { effectiveDate: "desc" },
      }),
      prisma.aircraftOperatingDefault.findMany({
        where: { aircraftMasterId: params.aircraftMasterId },
        orderBy: { effectiveDate: "desc" },
      }),
      prisma.charterMarketRate.findFirst({
        where: { aircraftMasterId: params.aircraftMasterId },
        orderBy: { effectiveDate: "desc" },
      }),
    ]);

  applyCrewRates(map, crewRates);
  applyTrainingCosts(map, trainingCosts);
  applyPrograms(map, programs);
  if (insurance?.annualPremiumEstimate) {
    map.insurance_annual = insurance.annualPremiumEstimate.toString();
    map.insurance_mode = "annual";
  }
  applyOperating(map, operating);
  applyCharterRate(map, charterRate);

  const icao = params.airportIcao?.toUpperCase();
  if (icao) {
    const airport = await prisma.airport.findUnique({
      where: { icao },
      include: {
        airportFeeSchedules: { take: 1, orderBy: { effectiveDate: "desc" } },
        fuelPrices: { take: 1, orderBy: { effectiveDate: "desc" } },
        fboLocations: true,
      },
    });

    if (airport) {
      const fee = airport.airportFeeSchedules[0];
      if (fee?.annualFee) {
        map.airport_fees_annual = fee.annualFee.toString();
      }

      const fuel = airport.fuelPrices[0];
      const fuelPrice =
        fuel?.retailFuelPrice?.toString() ?? fuel?.homeFuelPrice?.toString();
      if (fuelPrice) {
        map.home_fuel_price = fuelPrice;
        map.away_fuel_price = fuelPrice;
        map.fuel_source = "fbo_retail";
      }

      const fboName = params.fboName?.trim();
      let fboPick = airport.fboLocations[0] ?? null;
      if (fboName) {
        fboPick =
          airport.fboLocations.find(
            (f) => f.fboName.toLowerCase() === fboName.toLowerCase()
          ) ?? fboPick;
      }
      if (fboPick?.fboName) map.fbo_name = fboPick.fboName;
      if (fboPick?.jetARetailPrice) {
        map.home_fuel_price = fboPick.jetARetailPrice.toString();
      }

      const hangarWhere: {
        airportId: string;
        aircraftMasterId?: string;
        fboLocationId?: string;
      } = { airportId: airport.id, aircraftMasterId: params.aircraftMasterId };
      if (fboPick) hangarWhere.fboLocationId = fboPick.id;

      let hangarRows = await prisma.hangarCost.findMany({
        where: hangarWhere,
        orderBy: { effectiveDate: "desc" },
        take: 5,
      });

      if (!hangarRows.length) {
        hangarRows = await prisma.hangarCost.findMany({
          where: {
            airportId: airport.id,
            aircraftMasterId: params.aircraftMasterId,
          },
          orderBy: { effectiveDate: "desc" },
          take: 5,
        });
      }

      if (!hangarRows.length) {
        hangarRows = await prisma.hangarCost.findMany({
          where: {
            airportId: airport.id,
            aircraftCategory: master.aircraftCategory,
          },
          orderBy: { effectiveDate: "desc" },
          take: 3,
        });
      }

      const hangar = resolveHangarCostFromRows({
        hangarRows,
        cabinSqft: master.cabinSqft,
      });
      if (hangar) {
        Object.assign(map, hangar);
      }

      if (airport.state) {
        const stateFactor = await prisma.stateCostFactor.findUnique({
          where: { state: airport.state },
        });
        if (stateFactor?.registrationTaxRatePct != null) {
          map.registration_tax_rate = stateFactor.registrationTaxRatePct.toString();
        }
        if (stateFactor?.jetFuelTaxDifferentialPerGal != null) {
          map.jet_fuel_tax_differential_per_gal =
            stateFactor.jetFuelTaxDifferentialPerGal.toString();
        }
      }
    }
  }

  map.pic_count = map.pic_count ?? "1";
  map.sic_count = map.sic_count ?? "1";
  map.crew_model = map.crew_model ?? "full_time";
  map.benefits_pct = map.benefits_pct ?? "16";

  return map;
}
