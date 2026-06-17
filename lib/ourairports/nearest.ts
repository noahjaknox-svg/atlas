import { Prisma } from "@prisma/client";

const EARTH_RADIUS_NM = 3440.065;

export function haversineDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

export async function findNearestAirports(
  db: import("@prisma/client").PrismaClient,
  lat: number,
  lng: number,
  limit = 5
) {
  const rows = await db.$queryRaw<
    {
      ident: string;
      icao: string | null;
      iata: string | null;
      name: string;
      municipality: string | null;
      latitude_deg: number;
      longitude_deg: number;
      distance_nm: number;
    }[]
  >(Prisma.sql`
    SELECT
      ident,
      icao,
      iata,
      name,
      municipality,
      latitude_deg::float8 AS latitude_deg,
      longitude_deg::float8 AS longitude_deg,
      (
        3440.065 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(latitude_deg::float8 - ${lat}) / 2), 2) +
          COS(RADIANS(${lat})) * COS(RADIANS(latitude_deg::float8)) *
          POWER(SIN(RADIANS(longitude_deg::float8 - ${lng}) / 2), 2)
        ))
      ) AS distance_nm
    FROM airport_reference
    WHERE airport_type != 'closed_airport'
      AND latitude_deg IS NOT NULL
      AND longitude_deg IS NOT NULL
    ORDER BY distance_nm ASC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    icao: r.icao ?? r.ident,
    ident: r.ident,
    iata: r.iata,
    airportName: r.name,
    city: r.municipality,
    latitudeDeg: r.latitude_deg,
    longitudeDeg: r.longitude_deg,
    distanceNm: Math.round(r.distance_nm * 10) / 10,
  }));
}
