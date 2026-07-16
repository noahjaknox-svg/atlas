import "./seed-env";
import { PrismaClient, AircraftCategory, FeatureCostType } from "@prisma/client";

const prisma = new PrismaClient();

type SeedAircraft = {
  manufacturer: string;
  model: string;
  modelCode: string;
  category: AircraftCategory;
  pax: number;
  sqft: number;
  cruise: number;
  emptyRange: number;
  rangeAtMaxPax: number;
  fuelGph: number;
  charter: number;
  averageCost: number;
};

const AIRCRAFT: SeedAircraft[] = [
  { manufacturer: "Bombardier", model: "Challenger 300", modelCode: "CL30", category: "super_midsize_jet", pax: 9, sqft: 860, cruise: 470, emptyRange: 3100, rangeAtMaxPax: 2900, fuelGph: 220, charter: 6500, averageCost: 9000000 },
  { manufacturer: "Bombardier", model: "Challenger 350", modelCode: "CL35", category: "super_midsize_jet", pax: 9, sqft: 930, cruise: 470, emptyRange: 3200, rangeAtMaxPax: 3000, fuelGph: 230, charter: 7000, averageCost: 11000000 },
  { manufacturer: "Bombardier", model: "Challenger 605", modelCode: "CL60", category: "large_cabin_jet", pax: 10, sqft: 1150, cruise: 470, emptyRange: 4000, rangeAtMaxPax: 3700, fuelGph: 285, charter: 8800, averageCost: 13000000 },
  { manufacturer: "Gulfstream", model: "G550", modelCode: "GLF5", category: "ultra_long_range_jet", pax: 16, sqft: 1670, cruise: 488, emptyRange: 6750, rangeAtMaxPax: 6000, fuelGph: 350, charter: 12000, averageCost: 22000000 },
  { manufacturer: "Gulfstream", model: "G650", modelCode: "GLF6", category: "ultra_long_range_jet", pax: 18, sqft: 2138, cruise: 516, emptyRange: 7000, rangeAtMaxPax: 6500, fuelGph: 380, charter: 15000, averageCost: 45000000 },
  { manufacturer: "Cessna", model: "Citation XLS", modelCode: "C56X", category: "midsize_jet", pax: 8, sqft: 461, cruise: 441, emptyRange: 2100, rangeAtMaxPax: 1800, fuelGph: 175, charter: 4200, averageCost: 6000000 },
  { manufacturer: "Dassault", model: "Falcon 2000", modelCode: "F2TH", category: "large_cabin_jet", pax: 10, sqft: 1024, cruise: 470, emptyRange: 3350, rangeAtMaxPax: 3100, fuelGph: 260, charter: 7500, averageCost: 12000000 },
];

const FBOS = [
  { fboName: "PrismJet", airportIcao: "KSDL", baseFuelRate: 5.25, hangarCostPerSqft: 24 },
  { fboName: "Signature Flight Support", airportIcao: "KPHX", baseFuelRate: 5.95, hangarCostPerSqft: 22 },
  { fboName: "Atlantic Aviation", airportIcao: "KTEB", baseFuelRate: 7.45, hangarCostPerSqft: 38 },
  { fboName: "Clay Lacy Aviation", airportIcao: "KVNY", baseFuelRate: 6.85, hangarCostPerSqft: 34 },
];

const FEATURES = [
  "Starlink",
  "Gogo Wi-Fi",
  "Cabin attendant package",
  "Premium detailing",
  "International operations package",
  "Maintenance tracking",
  "Enhanced cleaning",
  "Owner portal package",
];

const OPERATING_MODELS = [
  { name: "Part 91 management only", charterEnabled: false },
  { name: "Part 91 plus Part 135 charter", charterEnabled: true },
  { name: "Charter-heavy management", charterEnabled: true },
  { name: "Acquisition plus management", charterEnabled: false },
];

async function main() {
  console.log("Seeding Atlas reference data...");

  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  for (const m of OPERATING_MODELS) {
    const existing = await prisma.operatingModel.findFirst({ where: { name: m.name } });
    if (!existing) {
      await prisma.operatingModel.create({
        data: {
          name: m.name,
          regulatoryModel: m.name,
          charterEnabled: m.charterEnabled,
          crewRequired: true,
          description: m.name,
        },
      });
    }
  }

  for (const a of AIRCRAFT) {
    const displayName = `${a.manufacturer} ${a.model}`;
    await prisma.aircraftType.upsert({
      where: { displayName },
      update: { status: "published" },
      create: {
        displayName,
        status: "published",
        manufacturer: a.manufacturer,
        model: a.model,
        modelCode: a.modelCode,
        aircraftCategory: a.category,
        passengerCapacity: a.pax,
        emptyRange: a.emptyRange,
        rangeAtMaxPassengers: a.rangeAtMaxPax,
        crewCount: 2,
        squareFootage: a.sqft,
        averageCruiseSpeed: a.cruise,
        wifi: true,
        homeFuelPct: 70,
        fuelGallonsPerHour: a.fuelGph,
        partsProgram: 495,
        engineProgram: 1150,
        apuProgram: 90,
        inspectionReserve: 75,
        tripExpenseHourly: 250,
        defaultMinimumCrew: 2,
        leadPilotSalary: 240000,
        leadPilotTrainingCost: 15666,
        picSalary: 200000,
        sicSalary: 150000,
        picTrainingCost: 15666,
        sicTrainingCost: 15667,
        maxUsage1Pilot: 200,
        maxUsage2Pilots: 450,
        maxUsage3Pilots: 600,
        maxUsage4Pilots: 700,
        maxUsage5Pilots: 800,
        maxUsage6Pilots: 900,
        averageCost: a.averageCost,
        charterHourlyRate: a.charter,
        fuelSurcharge: 600,
        pilotCharterIncentive: 113,
      },
    });
  }

  for (const f of FBOS) {
    await prisma.fbo.upsert({
      where: { fboName_airportIcao: { fboName: f.fboName, airportIcao: f.airportIcao } },
      update: {},
      create: {
        fboName: f.fboName,
        airportIcao: f.airportIcao,
        baseFuelRate: f.baseFuelRate,
        hangarCostPerSqft: f.hangarCostPerSqft,
      },
    });
  }

  for (const name of FEATURES) {
    const existing = await prisma.featureOption.findFirst({ where: { featureName: name } });
    if (existing) continue;
    await prisma.featureOption.create({
      data: {
        featureName: name,
        featureCategory: "optional",
        costType: name === "Starlink" ? FeatureCostType.one_time : FeatureCostType.monthly,
        defaultInstallCost: name === "Starlink" ? 150000 : null,
        defaultMonthlyCost: name === "Gogo Wi-Fi" ? 3500 : 500,
        clientVisibleDefault: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
