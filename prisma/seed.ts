import { PrismaClient, AircraftCategory, DataConfidence, FeatureCostType } from "@prisma/client";

const prisma = new PrismaClient();

const AIRCRAFT = [
  { manufacturer: "Bombardier", model: "Challenger 300", category: "super_midsize_jet" as AircraftCategory, fuel: 220, charter: 6500 },
  { manufacturer: "Bombardier", model: "Challenger 350", category: "super_midsize_jet" as AircraftCategory, fuel: 230, charter: 7000 },
  { manufacturer: "Bombardier", model: "Challenger 604", category: "large_cabin_jet" as AircraftCategory, fuel: 280, charter: 8500 },
  { manufacturer: "Bombardier", model: "Challenger 605", category: "large_cabin_jet" as AircraftCategory, fuel: 285, charter: 8800 },
  { manufacturer: "Bombardier", model: "Lear 45XR", category: "midsize_jet" as AircraftCategory, fuel: 180, charter: 4500 },
  { manufacturer: "Gulfstream", model: "G550", category: "ultra_long_range_jet" as AircraftCategory, fuel: 350, charter: 12000 },
  { manufacturer: "Gulfstream", model: "G650", category: "ultra_long_range_jet" as AircraftCategory, fuel: 380, charter: 15000 },
  { manufacturer: "Cessna", model: "Citation XLS", category: "midsize_jet" as AircraftCategory, fuel: 175, charter: 4200 },
  { manufacturer: "Cessna", model: "Citation Sovereign", category: "super_midsize_jet" as AircraftCategory, fuel: 210, charter: 5800 },
  { manufacturer: "Dassault", model: "Falcon 2000", category: "large_cabin_jet" as AircraftCategory, fuel: 260, charter: 7500 },
];

const AIRPORTS = [
  { icao: "KSDL", name: "Scottsdale Airport", city: "Scottsdale", state: "AZ" },
  { icao: "KPHX", name: "Phoenix Sky Harbor", city: "Phoenix", state: "AZ" },
  { icao: "KLAS", name: "Harry Reid International", city: "Las Vegas", state: "NV" },
  { icao: "KTEB", name: "Teterboro Airport", city: "Teterboro", state: "NJ" },
  { icao: "KVNY", name: "Van Nuys Airport", city: "Van Nuys", state: "CA" },
  { icao: "KAPA", name: "Centennial Airport", city: "Denver", state: "CO" },
  { icao: "KDAL", name: "Dallas Love Field", city: "Dallas", state: "TX" },
  { icao: "KPBI", name: "Palm Beach International", city: "West Palm Beach", state: "FL" },
  { icao: "KOPF", name: "Miami-Opa Locka Executive", city: "Opa-locka", state: "FL" },
  { icao: "KHPN", name: "Westchester County Airport", city: "White Plains", state: "NY" },
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
    const existing = await prisma.aircraftMaster.findFirst({
      where: { manufacturer: a.manufacturer, model: a.model },
    });
    if (existing) continue;

    const master = await prisma.aircraftMaster.create({
      data: {
        manufacturer: a.manufacturer,
        model: a.model,
        aircraftCategory: a.category,
        typicalFuelBurnGph: a.fuel,
        typicalCharterRate: a.charter,
        typicalCrewRequired: 2,
        maxRecommendedUtilization: 600,
        defaultEngineModel: "TBD",
        defaultApuModel: "TBD",
        dataConfidence: DataConfidence.medium,
      },
    });

    await prisma.crewRate.createMany({
      data: [
        {
          aircraftMasterId: master.id,
          role: "pic",
          salaryBase: 185000,
          benefitsPercent: 28,
          payrollTaxPercent: 8,
          confidence: DataConfidence.medium,
        },
        {
          aircraftMasterId: master.id,
          role: "sic",
          salaryBase: 120000,
          benefitsPercent: 28,
          payrollTaxPercent: 8,
          confidence: DataConfidence.medium,
        },
      ],
    });

    await prisma.charterMarketRate.create({
      data: {
        aircraftMasterId: master.id,
        retailRateBase: a.charter,
        ownerPaybackPercent: 85,
        fuelSurcharge: 45,
        confidence: DataConfidence.medium,
      },
    });
  }

  for (const ap of AIRPORTS) {
    await prisma.airport.upsert({
      where: { icao: ap.icao },
      update: {},
      create: {
        icao: ap.icao,
        airportName: ap.name,
        city: ap.city,
        state: ap.state,
        country: "US",
        timezone: "America/Phoenix",
      },
    });

    const airport = await prisma.airport.findUniqueOrThrow({ where: { icao: ap.icao } });

    await prisma.fuelPrice.create({
      data: {
        airportId: airport.id,
        fuelType: "Jet-A",
        homeFuelPrice: 5.25 + Math.random() * 0.5,
        retailFuelPrice: 6.75 + Math.random() * 0.5,
        confidence: DataConfidence.medium,
        effectiveDate: new Date(),
      },
    }).catch(() => {});

    await prisma.hangarCost.create({
      data: {
        airportId: airport.id,
        aircraftCategory: "super_midsize_jet",
        monthlyCostBase: 4500 + Math.floor(Math.random() * 2000),
        confidence: DataConfidence.medium,
        effectiveDate: new Date(),
      },
    }).catch(() => {});
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
        confidence: DataConfidence.medium,
      },
    });
  }

  await prisma.stateCostFactor.upsert({
    where: { state: "AZ" },
    update: {},
    create: {
      state: "AZ",
      registrationNotes: "Arizona registration applicable for home base.",
      taxNotes: "Consult tax advisor for personal vs business use.",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
