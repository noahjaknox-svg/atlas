import type { PrismaClient } from "@prisma/client";
import { find as findTimezones } from "geo-tz";
import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";
import type { EmptyLegTimezoneLayers } from "@/lib/charter/empty-legs/display-timezone";
import {
  FALLBACK_TIMEZONES,
  lookupFallbackTimezone,
} from "@/lib/schedule/airport-timezone-format";

export {
  FALLBACK_TIMEZONES,
  formatEmptyLegDateTime,
  formatEmptyLegDepartureDateOnly,
  formatEmptyLegDepartureLabel,
  formatEmptyLegDepartureLabelPublic,
  formatEmptyLegUtcInstant,
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

export function timezoneFromLatLon(lat: number, lon: number): string | null {
  try {
    const zones = findTimezones(lat, lon);
    const tz = zones[0] ?? null;
    if (!tz || tz === "UTC") return null;
    return tz;
  } catch {
    return null;
  }
}

/**
 * Crew-safe IANA resolve: override → geo-tz(lat/lon) → static fallback → null.
 * Never invents "UTC" (unlike schedule fill).
 */
export function resolveCrewAirportTimeZone(opts: {
  icao: string;
  lat?: number | null;
  lon?: number | null;
  override?: string | null;
}): string | null {
  const override = opts.override?.trim();
  if (override && override !== "UTC") return override;

  if (
    opts.lat != null &&
    opts.lon != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lon)
  ) {
    const geo = timezoneFromLatLon(opts.lat, opts.lon);
    if (geo) return geo;
  }

  return lookupFallbackTimezone(opts.icao);
}

function assignAlias(
  target: Record<string, string>,
  code: string | null | undefined,
  tz: string
) {
  if (!code?.trim()) return;
  const upper = code.trim().toUpperCase();
  target[upper] = tz;
  target[airportCodeKey(upper)] = tz;
  target[toIcaoDisplay(upper)] = tz;
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
  const { geoByIcao } = await loadAirportGeoTimezones(db, icaos);
  const unique = Array.from(new Set(icaos.map((c) => c.toUpperCase()).filter(Boolean)));
  const resolved: Record<string, string> = { ...FALLBACK_TIMEZONES, ...geoByIcao };
  for (const code of unique) {
    if (resolved[code] && resolved[code] !== "UTC") continue;
    resolved[code] =
      geoByIcao[code] ??
      geoByIcao[airportCodeKey(code)] ??
      geoByIcao[toIcaoDisplay(code)] ??
      lookupFallbackTimezone(code) ??
      "UTC";
  }
  return resolved;
}

/** Geo-tz / coordinate resolutions only — no fallback fill, no UTC. */
export async function loadAirportGeoTimezones(
  db: PrismaClient | { airportReference: PrismaClient["airportReference"] },
  icaos: string[]
): Promise<{ geoByIcao: Record<string, string> }> {
  const unique = Array.from(new Set(icaos.map((c) => c.toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return { geoByIcao: {} };

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
      isoCountry: true,
      latitudeDeg: true,
      longitudeDeg: true,
    },
  });

  const geoByIcao: Record<string, string> = {};

  // Prefer US ICAO (K…) first so a foreign localCode like AR "SDL" cannot
  // overwrite Scottsdale when both match the same FAA-style lookup key.
  const ordered = [...airports].sort((a, b) => {
    const aUs = (a.isoCountry ?? "").toUpperCase() === "US" ? 0 : 1;
    const bUs = (b.isoCountry ?? "").toUpperCase() === "US" ? 0 : 1;
    if (aUs !== bUs) return aUs - bUs;
    const aK = (a.icao ?? a.ident ?? "").startsWith("K") ? 0 : 1;
    const bK = (b.icao ?? b.ident ?? "").startsWith("K") ? 0 : 1;
    return aK - bK;
  });

  for (const airport of ordered) {
    if (airport.latitudeDeg == null || airport.longitudeDeg == null) continue;
    const lat = Number(airport.latitudeDeg);
    const lon = Number(airport.longitudeDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const tz = timezoneFromLatLon(lat, lon);
    if (!tz || tz === "UTC") continue;
    const isUs = (airport.isoCountry ?? "").toUpperCase() === "US";
    assignAlias(geoByIcao, airport.icao, tz);
    assignAlias(geoByIcao, airport.ident, tz);
    assignAlias(geoByIcao, airport.gpsCode, tz);
    // Non-US localCode aliases collide with US FAA LIDs (e.g. Saladillo "SDL").
    if (isUs) assignAlias(geoByIcao, airport.localCode, tz);
  }

  return { geoByIcao };
}

export async function loadAirportTimezoneOverrides(
  db: PrismaClient | {
    airportTimezoneOverride?: PrismaClient["airportTimezoneOverride"];
  },
  icaos: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(icaos.map((c) => c.toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return {};

  const delegate = db.airportTimezoneOverride;
  if (
    !delegate ||
    typeof (delegate as { findMany?: unknown }).findMany !== "function"
  ) {
    return {};
  }

  const lookupKeys = new Set<string>();
  for (const code of unique) {
    lookupKeys.add(code);
    lookupKeys.add(airportCodeKey(code));
    lookupKeys.add(toIcaoDisplay(code));
  }

  const rows = await delegate.findMany({
    where: { icao: { in: Array.from(lookupKeys) } },
    select: { icao: true, ianaTimezone: true },
  });

  const overridesByIcao: Record<string, string> = {};
  for (const row of rows) {
    if (!row.ianaTimezone || row.ianaTimezone === "UTC") continue;
    assignAlias(overridesByIcao, row.icao, row.ianaTimezone);
  }
  return overridesByIcao;
}

/** Layers used by empty-leg serialize / public payloads. */
export async function loadEmptyLegTimezoneLayers(
  db: PrismaClient,
  icaos: string[]
): Promise<EmptyLegTimezoneLayers> {
  const [{ geoByIcao }, overridesByIcao] = await Promise.all([
    loadAirportGeoTimezones(db, icaos),
    loadAirportTimezoneOverrides(db, icaos),
  ]);
  return { geoByIcao, overridesByIcao };
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
