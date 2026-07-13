import type { PrismaClient } from "@prisma/client";
import { find as findTimezones } from "geo-tz";
import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";
import {
  FALLBACK_TIMEZONES,
  lookupFallbackTimezone,
} from "@/lib/schedule/airport-timezone-format";

export {
  FALLBACK_TIMEZONES,
  formatEmptyLegDateTime,
  formatEmptyLegDepartureLabel,
  formatScheduleTime,
  formatScheduleTimeRange,
  getBrowserTimezone,
  lookupFallbackTimezone,
  mergeTimezoneMap,
  resolveBlockTimezone,
  resolveRowTimezone,
  timezoneAbbr,
  type ScheduleTimeMode,
} from "@/lib/schedule/airport-timezone-format";

function timezoneFromLatLon(lat: number, lon: number): string | null {
  try {
    const zones = findTimezones(lat, lon);
    return zones[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve IANA timezones for airport codes using AirportReference coordinates + geo-tz,
 * with a static fallback map for misses.
 * Server-only: geo-tz reads timezone polygons from disk (Node `fs`).
 */
export async function loadAirportTimezones(
  db: PrismaClient | { airportReference: PrismaClient["airportReference"] },
  icaos: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(icaos.map((c) => c.toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return { ...FALLBACK_TIMEZONES };

  const lookupKeys = new Set<string>();
  for (const code of unique) {
    lookupKeys.add(code);
    lookupKeys.add(airportCodeKey(code));
    lookupKeys.add(toIcaoDisplay(code));
  }

  const airports = await db.airportReference.findMany({
    where: {
      OR: [
        { icao: { in: Array.from(lookupKeys) } },
        { ident: { in: Array.from(lookupKeys) } },
        { gpsCode: { in: Array.from(lookupKeys) } },
        { localCode: { in: Array.from(lookupKeys) } },
      ],
    },
    select: {
      icao: true,
      ident: true,
      gpsCode: true,
      localCode: true,
      latitudeDeg: true,
      longitudeDeg: true,
    },
  });

  const fromCoords: Record<string, string> = {};

  function assign(code: string | null | undefined, tz: string) {
    if (!code?.trim()) return;
    const upper = code.trim().toUpperCase();
    fromCoords[upper] = tz;
    fromCoords[airportCodeKey(upper)] = tz;
    fromCoords[toIcaoDisplay(upper)] = tz;
  }

  for (const airport of airports) {
    if (airport.latitudeDeg == null || airport.longitudeDeg == null) continue;
    const lat = Number(airport.latitudeDeg);
    const lon = Number(airport.longitudeDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const tz = timezoneFromLatLon(lat, lon);
    if (!tz) continue;
    assign(airport.icao, tz);
    assign(airport.ident, tz);
    assign(airport.gpsCode, tz);
    assign(airport.localCode, tz);
  }

  // Ensure every requested code has an entry (coords → fallback → UTC).
  const resolved: Record<string, string> = { ...FALLBACK_TIMEZONES, ...fromCoords };
  for (const code of unique) {
    if (resolved[code]) continue;
    resolved[code] =
      fromCoords[airportCodeKey(code)] ??
      fromCoords[toIcaoDisplay(code)] ??
      lookupFallbackTimezone(code) ??
      "UTC";
  }

  return resolved;
}

export function collectIcaosFromSchedule(
  tails: { homeBase: string | null }[],
  events: { depIcao: string | null; arrIcao: string | null; locationIcao: string | null }[]
): string[] {
  const icaos = new Set<string>();
  for (const t of tails) {
    if (t.homeBase) icaos.add(t.homeBase.toUpperCase());
  }
  for (const e of events) {
    if (e.depIcao) icaos.add(e.depIcao.toUpperCase());
    if (e.arrIcao) icaos.add(e.arrIcao.toUpperCase());
    if (e.locationIcao) icaos.add(e.locationIcao.toUpperCase());
  }
  return Array.from(icaos);
}
