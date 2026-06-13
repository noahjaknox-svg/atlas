import type {
  AirportFrequencyReference,
  AirportReference,
  AirportRunwayReference,
  PrismaClient,
} from "@prisma/client";
import { normalizeAirportCode } from "@/lib/ourairports/csv";
import type { AirportReferenceWire, AirportSearchHit } from "@/lib/ourairports/types";

type AirportWithRelations = AirportReference & {
  runways: AirportRunwayReference[];
  frequencies: AirportFrequencyReference[];
};

function decimalToNumber(value: { toString(): string } | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function serializeAirportReference(
  airport: AirportWithRelations,
  extras?: { countryName?: string | null; regionName?: string | null }
): AirportReferenceWire {
  const icao = airport.icao ?? airport.ident;
  return {
    icao,
    ident: airport.ident,
    iata: airport.iata,
    name: airport.name,
    type: airport.airportType,
    latitudeDeg: decimalToNumber(airport.latitudeDeg),
    longitudeDeg: decimalToNumber(airport.longitudeDeg),
    elevationFt: airport.elevationFt,
    continent: airport.continent,
    isoCountry: airport.isoCountry,
    isoRegion: airport.isoRegion,
    municipality: airport.municipality,
    scheduledService: airport.scheduledService,
    gpsCode: airport.gpsCode,
    localCode: airport.localCode,
    homeLink: airport.homeLink,
    wikipediaLink: airport.wikipediaLink,
    keywords: airport.keywords,
    longestRunwayFt: airport.longestRunwayFt,
    countryName: extras?.countryName ?? null,
    regionName: extras?.regionName ?? null,
    runways: airport.runways.map((r) => ({
      lengthFt: r.lengthFt,
      widthFt: r.widthFt,
      surface: r.surface,
      lighted: r.lighted,
      closed: r.closed,
      leIdent: r.leIdent,
      heIdent: r.heIdent,
      leHeadingDegT: r.leHeadingDegT,
      heHeadingDegT: r.heHeadingDegT,
    })),
    frequencies: airport.frequencies.map((f) => ({
      type: f.type,
      description: f.description,
      frequencyMhz: decimalToNumber(f.frequencyMhz),
    })),
    updatedAt: airport.updatedAt.toISOString(),
  };
}

export function serializeSearchHit(airport: AirportReference): AirportSearchHit {
  return {
    icao: airport.icao ?? airport.ident,
    ident: airport.ident,
    iata: airport.iata,
    name: airport.name,
    municipality: airport.municipality,
    isoCountry: airport.isoCountry,
    type: airport.airportType,
  };
}

export async function findAirportReferenceByCode(
  db: PrismaClient,
  code: string
): Promise<AirportWithRelations | null> {
  const normalized = normalizeAirportCode(code);
  return db.airportReference.findFirst({
    where: {
      OR: [{ icao: normalized }, { ident: normalized }, { iata: normalized }],
    },
    include: {
      runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
      frequencies: { orderBy: [{ type: "asc" }, { frequencyMhz: "asc" }] },
    },
  });
}

export async function searchAirportReference(
  db: PrismaClient,
  query: string,
  limit = 20
): Promise<AirportSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const upper = q.toUpperCase();
  const rows = await db.airportReference.findMany({
    where: {
      airportType: { not: "closed_airport" },
      OR: [
        { icao: { startsWith: upper, mode: "insensitive" } },
        { ident: { startsWith: upper, mode: "insensitive" } },
        { iata: { startsWith: upper, mode: "insensitive" } },
        { municipality: { equals: q, mode: "insensitive" } },
        { municipality: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { keywords: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { scheduledService: "desc" },
      { airportType: "asc" },
      { name: "asc" },
    ],
    take: limit,
  });

  return rows.map(serializeSearchHit);
}

export async function enrichAirportReference(
  db: PrismaClient,
  airport: AirportWithRelations
): Promise<AirportReferenceWire> {
  const [country, region] = await Promise.all([
    db.countryReference.findUnique({ where: { code: airport.isoCountry } }),
    airport.isoRegion
      ? db.regionReference.findUnique({ where: { code: airport.isoRegion } })
      : null,
  ]);

  return serializeAirportReference(airport, {
    countryName: country?.name ?? null,
    regionName: region?.name ?? null,
  });
}
