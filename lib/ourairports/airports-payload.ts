import type { PrismaClient } from "@prisma/client";
import {
  serializeCrewAirport,
  type CrewAirportsPayload,
} from "@/lib/ourairports/crew-wire";
import { compareAirportsUsFirst } from "@/lib/ourairports/us-first-list";

const CHARTER_AIRPORT_TYPES = [
  "large_airport",
  "medium_airport",
  "small_airport",
] as const;

export async function buildCrewAirportsPayloadFromDb(
  db: PrismaClient,
  ifModifiedSince?: Date | null
): Promise<CrewAirportsPayload> {
  const latest = await db.airportReference.aggregate({
    _max: { updatedAt: true },
    where: {
      airportType: { in: [...CHARTER_AIRPORT_TYPES] },
      icao: { not: null },
    },
  });

  const maxUpdated = latest._max.updatedAt;
  if (ifModifiedSince && maxUpdated && maxUpdated <= ifModifiedSince) {
    return {
      syncedAt: new Date().toISOString(),
      count: 0,
      unchanged: true,
      airports: [],
    };
  }

  const rows = await db.airportReference.findMany({
    where: {
      airportType: { in: [...CHARTER_AIRPORT_TYPES] },
      icao: { not: null },
    },
    include: {
      runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
      frequencies: { orderBy: [{ type: "asc" }, { frequencyMhz: "asc" }] },
    },
    orderBy: { icao: "asc" },
  });

  rows.sort(compareAirportsUsFirst);

  const airports = rows.map(serializeCrewAirport);

  return {
    syncedAt: new Date().toISOString(),
    count: airports.length,
    airports,
  };
}

export async function buildCrewAirportsSampleFromDb(
  db: PrismaClient,
  icaos: string[]
): Promise<CrewAirportsPayload> {
  const airports = [];
  for (const code of icaos) {
    const row = await db.airportReference.findFirst({
      where: { OR: [{ icao: code }, { ident: code }] },
      include: {
        runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
        frequencies: { orderBy: [{ type: "asc" }, { frequencyMhz: "asc" }] },
      },
    });
    if (row) airports.push(serializeCrewAirport(row));
  }

  return {
    syncedAt: new Date().toISOString(),
    count: airports.length,
    airports,
  };
}
