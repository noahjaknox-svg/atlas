import type { PrismaClient } from "@prisma/client";
import { join } from "path";
import {
  OURAIRPORTS_FILES,
  parseBool01,
  parseFloatOrNull,
  parseIntOrNull,
  readOurAirportsCsv,
  resolveIcaoFromRow,
} from "@/lib/ourairports/csv";
import { computeRunwayGradientEstimated } from "@/lib/ourairports/gradient";

const CREATE_BATCH = 2000;

export type OurAirportsImportResult = {
  countries: number;
  regions: number;
  airports: number;
  runways: number;
  frequencies: number;
};

function dataDir(custom?: string) {
  return custom ?? join(process.cwd(), "data", "ourairports");
}

async function createManyBatched<T extends Record<string, unknown>>(
  items: T[],
  run: (batch: T[]) => Promise<{ count: number }>
): Promise<number> {
  let total = 0;
  for (let i = 0; i < items.length; i += CREATE_BATCH) {
    const batch = items.slice(i, i + CREATE_BATCH);
    const result = await run(batch);
    total += result.count;
    if (i === 0 || (i + CREATE_BATCH) % 10000 === 0 || i + CREATE_BATCH >= items.length) {
      process.stdout.write(`    ${Math.min(i + CREATE_BATCH, items.length)} / ${items.length}\r`);
    }
  }
  console.log();
  return total;
}

export async function importOurAirportsData(
  prisma: PrismaClient,
  options?: { dataPath?: string; sourceVersion?: string }
): Promise<OurAirportsImportResult> {
  const dir = dataDir(options?.dataPath);
  const version = options?.sourceVersion ?? new Date().toISOString().slice(0, 10);

  for (const file of OURAIRPORTS_FILES) {
    const full = join(dir, file);
    try {
      readOurAirportsCsv(full);
    } catch {
      throw new Error(
        `Missing ${file}. Run: npm run db:ourairports-download (or place CSVs in data/ourairports/)`
      );
    }
  }

  console.log("  Parsing CSVs…");
  const countryRows = readOurAirportsCsv(join(dir, "countries.csv"));
  const regionRows = readOurAirportsCsv(join(dir, "regions.csv"));
  const airportRows = readOurAirportsCsv(join(dir, "airports.csv"));
  const runwayRows = readOurAirportsCsv(join(dir, "runways.csv"));
  const frequencyRows = readOurAirportsCsv(join(dir, "airport-frequencies.csv"));

  console.log("  Clearing existing reference rows…");
  await prisma.airportFrequencyReference.deleteMany();
  await prisma.airportRunwayReference.deleteMany();
  await prisma.airportReference.deleteMany();
  await prisma.regionReference.deleteMany();
  await prisma.countryReference.deleteMany();

  console.log("  Importing countries…");
  const countries = await createManyBatched(
    countryRows.map((row) => ({
      id: parseIntOrNull(row.id)!,
      code: row.code,
      name: row.name,
      continent: row.continent || null,
      wikipediaLink: row.wikipedia_link || null,
      keywords: row.keywords || null,
    })),
    (batch) => prisma.countryReference.createMany({ data: batch }),
  );

  console.log("  Importing regions…");
  const regions = await createManyBatched(
    regionRows.map((row) => ({
      id: parseIntOrNull(row.id)!,
      code: row.code,
      localCode: row.local_code || null,
      name: row.name,
      continent: row.continent || null,
      isoCountry: row.iso_country,
      wikipediaLink: row.wikipedia_link || null,
      keywords: row.keywords || null,
    })),
    (batch) => prisma.regionReference.createMany({ data: batch }),
  );

  const longestByIdent = new Map<string, number>();
  for (const row of runwayRows) {
    const ident = row.airport_ident?.trim().toUpperCase();
    const len = parseIntOrNull(row.length_ft);
    if (!ident || !len) continue;
    const prev = longestByIdent.get(ident) ?? 0;
    if (len > prev) longestByIdent.set(ident, len);
  }

  console.log("  Importing airports…");
  const seenIds = new Set<number>();
  const seenIdent = new Set<string>();
  const seenIcao = new Set<string>();

  const airportCreates = airportRows.flatMap((row) => {
    const ourairportsId = parseIntOrNull(row.id);
    if (ourairportsId == null || seenIds.has(ourairportsId)) return [];
    const ident = row.ident.trim().toUpperCase();
    if (!ident || seenIdent.has(ident)) return [];
    const icao = resolveIcaoFromRow(row);
    if (icao && seenIcao.has(icao)) return [];

    seenIds.add(ourairportsId);
    seenIdent.add(ident);
    if (icao) seenIcao.add(icao);

    return [
      {
        ourairportsId,
        ident,
        icao,
        iata: row.iata_code?.trim().toUpperCase() || null,
        airportType: row.type,
        name: row.name,
        latitudeDeg: parseFloatOrNull(row.latitude_deg),
        longitudeDeg: parseFloatOrNull(row.longitude_deg),
        elevationFt: parseIntOrNull(row.elevation_ft),
        continent: row.continent || null,
        isoCountry: row.iso_country,
        isoRegion: row.iso_region || null,
        municipality: row.municipality || null,
        scheduledService: row.scheduled_service?.toLowerCase() === "yes",
        gpsCode: row.gps_code?.trim().toUpperCase() || null,
        localCode: row.local_code || null,
        homeLink: row.home_link || null,
        wikipediaLink: row.wikipedia_link || null,
        keywords: row.keywords || null,
        longestRunwayFt: longestByIdent.get(ident) ?? null,
        sourceVersion: version,
      },
    ];
  });

  console.log(`    ${airportCreates.length} unique airports from ${airportRows.length} CSV rows`);

  const airports = await createManyBatched(airportCreates, (batch) =>
    prisma.airportReference.createMany({ data: batch, skipDuplicates: true })
  );

  console.log("  Building ident index…");
  const identToId = new Map(
    (
      await prisma.airportReference.findMany({
        select: { id: true, ident: true },
      })
    ).map((a) => [a.ident, a.id])
  );

  console.log("  Importing runways…");
  const runwayCreates = runwayRows
    .map((row) => {
      const ident = row.airport_ident?.trim().toUpperCase();
      const airportId = ident ? identToId.get(ident) : undefined;
      if (!airportId || !ident) return null;
      const leElevationFt = parseIntOrNull(row.le_elevation_ft);
      const heElevationFt = parseIntOrNull(row.he_elevation_ft);
      const lengthFt = parseIntOrNull(row.length_ft);
      const runwayRow = {
        lengthFt,
        leElevationFt,
        heElevationFt,
        leIdent: row.le_ident || null,
        heIdent: row.he_ident || null,
      };
      return {
        ourairportsId: parseIntOrNull(row.id)!,
        airportId,
        airportIdent: ident,
        lengthFt,
        widthFt: parseIntOrNull(row.width_ft),
        surface: row.surface || null,
        lighted: parseBool01(row.lighted),
        closed: parseBool01(row.closed),
        leIdent: runwayRow.leIdent,
        leLatitudeDeg: parseFloatOrNull(row.le_latitude_deg),
        leLongitudeDeg: parseFloatOrNull(row.le_longitude_deg),
        leElevationFt,
        leHeadingDegT: parseIntOrNull(row.le_heading_degT),
        leDisplacedThresholdFt: parseIntOrNull(row.le_displaced_threshold_ft),
        heIdent: runwayRow.heIdent,
        heLatitudeDeg: parseFloatOrNull(row.he_latitude_deg),
        heLongitudeDeg: parseFloatOrNull(row.he_longitude_deg),
        heElevationFt,
        heHeadingDegT: parseIntOrNull(row.he_heading_degT),
        heDisplacedThresholdFt: parseIntOrNull(row.he_displaced_threshold_ft),
        gradientPctEstimated: computeRunwayGradientEstimated(runwayRow as never),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const runways = await createManyBatched(runwayCreates, (batch) =>
    prisma.airportRunwayReference.createMany({ data: batch })
  );

  console.log("  Importing frequencies…");
  const frequencyCreates = frequencyRows
    .map((row) => {
      const ident = row.airport_ident?.trim().toUpperCase();
      const airportId = ident ? identToId.get(ident) : undefined;
      if (!airportId || !ident) return null;
      return {
        ourairportsId: parseIntOrNull(row.id)!,
        airportId,
        airportIdent: ident,
        type: row.type,
        description: row.description || null,
        frequencyMhz: parseFloatOrNull(row.frequency_mhz),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const frequencies = await createManyBatched(frequencyCreates, (batch) =>
    prisma.airportFrequencyReference.createMany({ data: batch })
  );

  return { countries, regions, airports, runways, frequencies };
}
