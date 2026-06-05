import "../prisma/seed-env";
import {
  PrismaClient,
  DataConfidence,
  ProgramType,
  HangarPricingMethod,
  type AircraftCategory,
} from "@prisma/client";
import {
  CANONICAL_AIRCRAFT,
  HANGAR_PROVIDERS,
  OPERATING_COST_ROWS,
  PROGRAM_ROWS,
  SCENARIO_TEMPLATES,
  getRowValue,
  parseMoney,
  parseNumber,
  readAircraftCsvFile,
} from "../lib/csv-aircraft-import";

const prisma = new PrismaClient();
const EFFECTIVE_DATE = new Date("2026-01-01");
const SOURCE = "aircraft-master-proforma.csv";

const AIRPORTS = [
  { icao: "KSDL", name: "Scottsdale Airport", city: "Scottsdale", state: "AZ" },
  { icao: "KAPA", name: "Centennial Airport", city: "Denver", state: "CO" },
  { icao: "KBJC", name: "Rocky Mountain Metropolitan", city: "Broomfield", state: "CO" },
  { icao: "KGEG", name: "Spokane International", city: "Spokane", state: "WA" },
  { icao: "KSNA", name: "John Wayne Airport", city: "Santa Ana", state: "CA" },
];

async function upsertAirport(ap: (typeof AIRPORTS)[0]) {
  return prisma.airport.upsert({
    where: { icao: ap.icao },
    update: {},
    create: {
      icao: ap.icao,
      airportName: ap.name,
      city: ap.city,
      state: ap.state,
      country: "US",
    },
  });
}

async function upsertFbo(airportId: string, fboName: string) {
  const existing = await prisma.fboLocation.findFirst({
    where: { airportId, fboName },
  });
  if (existing) return existing;
  return prisma.fboLocation.create({
    data: { airportId, fboName, source: SOURCE },
  });
}

async function upsertAircraftMaster(spec: (typeof CANONICAL_AIRCRAFT)[0]) {
  const existing = await prisma.aircraftMaster.findFirst({
    where: { manufacturer: spec.manufacturer, model: spec.model },
  });
  if (existing) return existing;
  return prisma.aircraftMaster.create({
    data: {
      manufacturer: spec.manufacturer,
      model: spec.model,
      aircraftCategory: spec.category as AircraftCategory,
      dataConfidence: DataConfidence.high,
      sourceNotes: SOURCE,
    },
  });
}

async function upsertOperatingDefault(
  aircraftMasterId: string,
  costKey: string,
  amount: number
) {
  const existing = await prisma.aircraftOperatingDefault.findFirst({
    where: { aircraftMasterId, costKey, effectiveDate: EFFECTIVE_DATE },
  });
  if (existing) {
    return prisma.aircraftOperatingDefault.update({
      where: { id: existing.id },
      data: { annualAmount: amount, source: SOURCE, confidence: DataConfidence.high },
    });
  }
  return prisma.aircraftOperatingDefault.create({
    data: {
      aircraftMasterId,
      costKey,
      annualAmount: amount,
      source: SOURCE,
      confidence: DataConfidence.high,
      effectiveDate: EFFECTIVE_DATE,
    },
  });
}

async function main() {
  console.log("Importing aircraft reference data from CSV...");
  const parsed = readAircraftCsvFile();
  const masterIds = new Map<string, string>();

  for (const ap of AIRPORTS) {
    await upsertAirport(ap);
  }

  for (const spec of CANONICAL_AIRCRAFT) {
    const master = await upsertAircraftMaster(spec);
    masterIds.set(spec.csvColumn, master.id);

    const fuelRow = getRowValue(parsed.rows, "Fuel Burn Per Hour ");
    const sqftRow = getRowValue(parsed.rows, "Square footage");
    const hullRow = getRowValue(parsed.rows, "Average Aircraft Cost");
    const maxUtilRow = getRowValue(parsed.rows, "Max Aircraft Usage");
    const charterRow = getRowValue(parsed.rows, "Charter Hourly Rate");
    const maintReserveRow = getRowValue(parsed.rows, "Maintenance Reserve Budget Estimate");

    const fuel = parseNumber(fuelRow?.[spec.csvColumn]);
    const sqft = parseNumber(sqftRow?.[spec.csvColumn]);
    const hull = parseMoney(hullRow?.[spec.csvColumn]);
    const maxUtil = parseNumber(maxUtilRow?.[spec.csvColumn]);
    const charter = parseMoney(charterRow?.[spec.csvColumn]);

    await prisma.aircraftMaster.update({
      where: { id: master.id },
      data: {
        typicalFuelBurnGph: fuel ?? undefined,
        cabinSqft: sqft ? Math.round(sqft) : undefined,
        typicalHullValue: hull ?? undefined,
        maxRecommendedUtilization: maxUtil ? Math.round(maxUtil) : undefined,
        typicalCharterRate: charter ?? undefined,
        typicalCrewRequired: 2,
      },
    });

    const picRow = getRowValue(parsed.rows, "PIC Salary");
    const sicRow = getRowValue(parsed.rows, "SIC Salary");
    const trainingRow = getRowValue(parsed.rows, "Crew Training (Individual Pilot)");
    const insuranceRow = getRowValue(parsed.rows, "Insurance - Hull & Liability");
    const fuelSurchargeRow = getRowValue(parsed.rows, "Fuel Surcharge");

    const pic = parseMoney(picRow?.[spec.csvColumn]);
    const sic = parseMoney(sicRow?.[spec.csvColumn]);
    const training = parseMoney(trainingRow?.[spec.csvColumn]);
    const insurance = parseMoney(insuranceRow?.[spec.csvColumn]);
    const fuelSurcharge = parseMoney(fuelSurchargeRow?.[spec.csvColumn]);

    for (const [role, salary] of [
      ["pic", pic],
      ["sic", sic],
    ] as const) {
      if (salary == null) continue;
      const existing = await prisma.crewRate.findFirst({
        where: { aircraftMasterId: master.id, role, effectiveDate: EFFECTIVE_DATE },
      });
      const data = {
        salaryBase: salary,
        benefitsPercent: 16,
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
      };
      if (existing) {
        await prisma.crewRate.update({ where: { id: existing.id }, data });
      } else {
        await prisma.crewRate.create({
          data: { aircraftMasterId: master.id, role, ...data },
        });
      }
    }

    if (training != null) {
      const half = Math.round(training / 2);
      const sicHalf = training - half;
      for (const [role, cost] of [
        ["pic", half],
        ["sic", sicHalf],
      ] as const) {
        const existing = await prisma.trainingCost.findFirst({
          where: {
            aircraftMasterId: master.id,
            role,
            trainingType: "recurrent",
            effectiveDate: EFFECTIVE_DATE,
          },
        });
        const data = {
          annualCost: cost,
          source: SOURCE,
          confidence: DataConfidence.high,
          effectiveDate: EFFECTIVE_DATE,
        };
        if (existing) {
          await prisma.trainingCost.update({ where: { id: existing.id }, data });
        } else {
          await prisma.trainingCost.create({
            data: {
              aircraftMasterId: master.id,
              role,
              trainingType: "recurrent",
              ...data,
            },
          });
        }
      }
    }

    if (insurance != null) {
      const existing = await prisma.insuranceAssumption.findFirst({
        where: { aircraftMasterId: master.id, effectiveDate: EFFECTIVE_DATE },
      });
      const data = {
        annualPremiumEstimate: insurance,
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
      };
      if (existing) {
        await prisma.insuranceAssumption.update({ where: { id: existing.id }, data });
      } else {
        await prisma.insuranceAssumption.create({
          data: { aircraftMasterId: master.id, ...data },
        });
      }
    }

    for (const [rowLabel, costKey] of Object.entries(OPERATING_COST_ROWS)) {
      const row = getRowValue(parsed.rows, rowLabel);
      const amount = parseMoney(row?.[spec.csvColumn]);
      if (amount == null) continue;
      await upsertOperatingDefault(master.id, costKey, amount);
    }

    const PROGRAM_PROVIDERS: Record<string, string> = {
      "Inspection Reserve": "inspection_reserve",
      "Trip Expenses": "trip_expense",
    };

    for (const [rowLabel, programType] of Object.entries(PROGRAM_ROWS)) {
      const row = getRowValue(parsed.rows, rowLabel);
      const rate = parseMoney(row?.[spec.csvColumn]);
      if (rate == null) continue;
      const pt: ProgramType =
        programType === "parts"
          ? "parts"
          : programType === "engine"
            ? "engine"
            : programType === "apu"
              ? "apu"
              : "other";
      const provider = PROGRAM_PROVIDERS[rowLabel] ?? null;
      const existing = await prisma.programCost.findFirst({
        where: {
          aircraftMasterId: master.id,
          programType: pt,
          provider: provider ?? undefined,
          effectiveDate: EFFECTIVE_DATE,
        },
      });
      const data = {
        hourlyRate: rate,
        provider: provider ?? undefined,
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
      };
      if (existing) {
        await prisma.programCost.update({ where: { id: existing.id }, data });
      } else {
        await prisma.programCost.create({
          data: { aircraftMasterId: master.id, programType: pt, ...data },
        });
      }
    }

    if (charter != null) {
      const existing = await prisma.charterMarketRate.findFirst({
        where: { aircraftMasterId: master.id, airportId: null, effectiveDate: EFFECTIVE_DATE },
      });
      const data = {
        retailRateBase: charter,
        fuelSurcharge: fuelSurcharge ?? undefined,
        ownerPaybackPercent: 75,
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
      };
      if (existing) {
        await prisma.charterMarketRate.update({ where: { id: existing.id }, data });
      } else {
        await prisma.charterMarketRate.create({
          data: { aircraftMasterId: master.id, ...data },
        });
      }
    }

    const maintAnnual = parseMoney(maintReserveRow?.[spec.csvColumn]);
    if (maintAnnual != null && maxUtil && maxUtil > 0) {
      const hourly = Math.round(maintAnnual / maxUtil);
      const existing = await prisma.programCost.findFirst({
        where: {
          aircraftMasterId: master.id,
          programType: "airframe",
          effectiveDate: EFFECTIVE_DATE,
        },
      });
      const data = {
        hourlyRate: hourly,
        provider: "maintenance_reserve",
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
      };
      if (existing) {
        await prisma.programCost.update({ where: { id: existing.id }, data });
      } else {
        await prisma.programCost.create({
          data: { aircraftMasterId: master.id, programType: "airframe", ...data },
        });
      }
    }
  }

  const airportFeeRow = getRowValue(parsed.rows, "Airport Fee");
  const sdl = await prisma.airport.findUnique({ where: { icao: "KSDL" } });
  if (sdl && airportFeeRow) {
    const fee = parseMoney(airportFeeRow["Challenger 300"]) ?? 3674;
    const existing = await prisma.airportFeeSchedule.findFirst({
      where: { airportId: sdl.id, effectiveDate: EFFECTIVE_DATE },
    });
    if (existing) {
      await prisma.airportFeeSchedule.update({
        where: { id: existing.id },
        data: { annualFee: fee, source: SOURCE },
      });
    } else {
      await prisma.airportFeeSchedule.create({
        data: {
          airportId: sdl.id,
          annualFee: fee,
          source: SOURCE,
          effectiveDate: EFFECTIVE_DATE,
        },
      });
    }
  }

  await prisma.stateCostFactor.upsert({
    where: { state: "AZ" },
    update: {
      registrationTaxRatePct: 0.5,
      jetFuelTaxDifferentialPerGal: 0.175,
      source: SOURCE,
    },
    create: {
      state: "AZ",
      registrationTaxRatePct: 0.5,
      jetFuelTaxDifferentialPerGal: 0.175,
      registrationNotes: "Arizona aircraft registration",
      source: SOURCE,
    },
  });

  for (const provider of HANGAR_PROVIDERS) {
    if (provider.skipImport) continue;
    const airport = await prisma.airport.findUnique({
      where: { icao: provider.airportIcao },
    });
    if (!airport) continue;

    let fboId: string | null = null;
    if (provider.fboName) {
      const fbo = await upsertFbo(airport.id, provider.fboName);
      fboId = fbo.id;
    }

    const hangarRow = parsed.hangarRows.find((r) => r._label === provider.csvRow);
    if (!hangarRow) continue;

    for (const spec of CANONICAL_AIRCRAFT) {
      const masterId = masterIds.get(spec.csvColumn);
      if (!masterId) continue;
      const quoted = parseMoney(hangarRow[spec.csvColumn]);
      if (quoted == null) continue;

      const master = await prisma.aircraftMaster.findUnique({ where: { id: masterId } });
      const sqft = master?.cabinSqft ?? null;
      const ratePerSqft =
        provider.pricingMethod === "sqft_rate" && sqft && sqft > 0
          ? quoted / sqft
          : null;

      const existing = await prisma.hangarCost.findFirst({
        where: {
          airportId: airport.id,
          aircraftMasterId: masterId,
          fboLocationId: fboId,
          effectiveDate: EFFECTIVE_DATE,
        },
      });

      const data = {
        aircraftCategory: spec.category as AircraftCategory,
        provider: provider.csvRow,
        pricingMethod: provider.pricingMethod as HangarPricingMethod,
        quotedAnnual: quoted,
        ratePerSqftAnnual: ratePerSqft ?? undefined,
        monthlyCostBase: Math.round(quoted / 12),
        source: SOURCE,
        confidence: DataConfidence.high,
        effectiveDate: EFFECTIVE_DATE,
        fboLocationId: fboId ?? undefined,
      };

      if (existing) {
        await prisma.hangarCost.update({ where: { id: existing.id }, data });
      } else {
        await prisma.hangarCost.create({
          data: {
            airportId: airport.id,
            aircraftMasterId: masterId,
            ...data,
          },
        });
      }
    }
  }

  for (const template of SCENARIO_TEMPLATES) {
    const masterId = masterIds.get(template.masterColumn);
    if (!masterId) continue;

    const row = getRowValue(parsed.rows, "PIC Salary");
    const pic = parseMoney(row?.[template.name]);
    const sicRow = getRowValue(parsed.rows, "SIC Salary");
    const sic = parseMoney(sicRow?.[template.name]);
    const assumptions = { ...template.assumptions };
    if (pic != null) assumptions.pic_salary = String(pic);
    if (sic != null) assumptions.sic_salary = String(sic);

    const mgmtRow = getRowValue(parsed.rows, "Aircraft Management Fee ");
    const mgmt = parseMoney(mgmtRow?.[template.name]);
    if (mgmt != null) assumptions.management_fee = String(mgmt);

    const tpl = await prisma.scenarioTemplate.upsert({
      where: { name: template.name },
      update: { aircraftMasterId: masterId, description: SOURCE },
      create: {
        name: template.name,
        aircraftMasterId: masterId,
        description: SOURCE,
      },
    });

    for (const [key, value] of Object.entries(assumptions)) {
      await prisma.scenarioTemplateAssumption.upsert({
        where: {
          templateId_assumptionKey: { templateId: tpl.id, assumptionKey: key },
        },
        update: { value },
        create: { templateId: tpl.id, assumptionKey: key, value },
      });
    }
  }

  console.log(`Imported ${masterIds.size} aircraft types, hangar rates, and scenario templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
