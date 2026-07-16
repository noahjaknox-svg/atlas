import type { PrismaClient } from "@prisma/client";
import {
  serializeCrewAirport,
  type CrewAirportsPayload,
} from "@/lib/ourairports/crew-wire";
import { compareAirportsUsFirst } from "@/lib/ourairports/us-first-list";
import { decimalToNumber } from "@/lib/ourairports/lookup-utils";
import {
  loadAirportTimezoneOverrides,
  resolveCrewAirportTimeZone,
} from "@/lib/schedule/airport-timezones";

const CHARTER_AIRPORT_TYPES = [
  "large_airport",
  "medium_airport",
  "small_airport",
] as const;

function timeZoneForAirport(
  icao: string,
  lat: number | null,
  lon: number | null,
  overridesByIcao: Record<string, string>
): string | null {
  const override =
    overridesByIcao[icao] ??
    overridesByIcao[icao.replace(/^K/, "")] ??
    null;
  return resolveCrewAirportTimeZone({ icao, lat, lon, override });
}

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

  const icaos = rows.map((r) => (r.icao ?? r.ident).toUpperCase());
  const overridesByIcao = await loadAirportTimezoneOverrides(db, icaos);

  const airports = rows.map((row) => {
    const icao = (row.icao ?? row.ident).toUpperCase();
    const lat = decimalToNumber(row.latitudeDeg);
    const lon = decimalToNumber(row.longitudeDeg);
    return serializeCrewAirport(row, {
      timeZone: timeZoneForAirport(icao, lat, lon, overridesByIcao),
    });
  });

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
  const overridesByIcao = await loadAirportTimezoneOverrides(
    db,
    icaos.map((c) => c.toUpperCase())
  );
  const airports = [];
  for (const code of icaos) {
    const row = await db.airportReference.findFirst({
      where: { OR: [{ icao: code }, { ident: code }] },
      include: {
        runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
        frequencies: { orderBy: [{ type: "asc" }, { frequencyMhz: "asc" }] },
      },
    });
    if (row) {
      const icao = (row.icao ?? row.ident).toUpperCase();
      const lat = decimalToNumber(row.latitudeDeg);
      const lon = decimalToNumber(row.longitudeDeg);
      airports.push(
        serializeCrewAirport(row, {
          timeZone: timeZoneForAirport(icao, lat, lon, overridesByIcao),
        })
      );
    }
  }

  return {
    syncedAt: new Date().toISOString(),
    count: airports.length,
    airports,
  };
}
