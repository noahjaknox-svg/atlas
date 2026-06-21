import type {
  AirportFrequencyReference,
  AirportReference,
  AirportRunwayReference,
  PrismaClient,
} from "@prisma/client";
import { normalizeAirportCode } from "@/lib/ourairports/normalize-code";
import type { AirportReferenceWire, AirportSearchHit } from "@/lib/ourairports/types";
import { decimalToNumber } from "@/lib/ourairports/lookup-utils";
import { rankAirportSearchHits } from "@/lib/ourairports/search-rank";

type AirportWithRelations = AirportReference & {
  runways: AirportRunwayReference[];
  frequencies: AirportFrequencyReference[];
};

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
    sourceVersion: airport.sourceVersion,
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
      gradientPctVerified: r.gradientPctVerified,
      gradientHighEndVerified: r.gradientHighEndVerified,
      gradientPctEstimated: r.gradientPctEstimated,
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

  const upper = normalizeAirportCode(q);
  const isAirportCode = /^[A-Z0-9]{2,4}$/.test(upper);

  const codeClauses: object[] = [
    { icao: { equals: upper, mode: "insensitive" } },
    { ident: { equals: upper, mode: "insensitive" } },
    { iata: { equals: upper, mode: "insensitive" } },
    { localCode: { equals: upper, mode: "insensitive" } },
    { gpsCode: { equals: upper, mode: "insensitive" } },
    { icao: { startsWith: upper, mode: "insensitive" } },
    { ident: { startsWith: upper, mode: "insensitive" } },
    { iata: { startsWith: upper, mode: "insensitive" } },
    { localCode: { startsWith: upper, mode: "insensitive" } },
    { gpsCode: { startsWith: upper, mode: "insensitive" } },
  ];

  // FAA LID ↔ US ICAO (APA ↔ KAPA, SDL ↔ KSDL).
  if (upper.length === 3) {
    codeClauses.push(
      { icao: { equals: `K${upper}`, mode: "insensitive" } },
      { ident: { equals: `K${upper}`, mode: "insensitive" } },
      { gpsCode: { equals: `K${upper}`, mode: "insensitive" } }
    );
  } else if (upper.length === 4 && upper.startsWith("K")) {
    const lid = upper.slice(1);
    codeClauses.push(
      { localCode: { equals: lid, mode: "insensitive" } },
      { iata: { equals: lid, mode: "insensitive" } }
    );
  }

  const baseWhere = {
    airportType: { not: "closed_airport" as const },
    OR: isAirportCode
      ? codeClauses
      : [
          { municipality: { equals: q, mode: "insensitive" as const } },
          { municipality: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { keywords: { contains: q, mode: "insensitive" as const } },
        ],
  };

  const candidateTake = Math.max(limit * 3, 30);
  const orderBy = [
    { scheduledService: "desc" as const },
    { airportType: "asc" as const },
    { name: "asc" as const },
  ];

  const [usRows, nonUsRows] = await Promise.all([
    db.airportReference.findMany({
      where: { AND: [baseWhere, { isoCountry: "US" }] },
      orderBy,
      take: candidateTake,
    }),
    db.airportReference.findMany({
      where: { AND: [baseWhere, { isoCountry: { not: "US" } }] },
      orderBy,
      take: candidateTake,
    }),
  ]);

  return rankAirportSearchHits(q, [...usRows, ...nonUsRows].map(serializeSearchHit)).slice(0, limit);
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
