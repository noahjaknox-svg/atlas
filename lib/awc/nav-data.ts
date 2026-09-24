import type { AirportNavData, PrismaClient } from "@prisma/client";
import {
  fetchAwcAirports,
  type AwcAirportNav,
  type AwcFrequency,
  type AwcRunway,
} from "@/lib/awc/airport";

/** Airport nav data changes rarely; a week keeps us far under AWC's rate limit. */
export const NAV_DATA_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Re-ask sooner when AWC had no record (it may be added, or the code corrected). */
export const NAV_DATA_NOT_FOUND_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CachedAirportNav = AwcAirportNav & {
  fetchedAt: Date;
  /** Served from an out-of-date cache entry because AWC couldn't be reached. */
  stale: boolean;
};

function rowToNav(row: AirportNavData, stale: boolean): CachedAirportNav | null {
  if (!row.found) return null;
  return {
    icao: row.icao,
    faaId: row.faaId,
    iataId: row.iataId,
    name: row.name,
    state: null,
    country: null,
    dataSource: row.dataSource,
    latitudeDeg: row.latitudeDeg,
    longitudeDeg: row.longitudeDeg,
    elevationFt: row.elevationFt,
    magneticVariationDeg: row.magneticVariationDeg,
    hasTower: row.hasTower,
    hasBeacon: row.hasBeacon,
    runways: (Array.isArray(row.runways) ? row.runways : []) as unknown as AwcRunway[],
    frequencies: (Array.isArray(row.frequencies) ? row.frequencies : []) as unknown as AwcFrequency[],
    fetchedAt: row.fetchedAt,
    stale,
  };
}

function isFresh(row: AirportNavData, now: number): boolean {
  const age = now - row.fetchedAt.getTime();
  return age < (row.found ? NAV_DATA_MAX_AGE_MS : NAV_DATA_NOT_FOUND_MAX_AGE_MS);
}

function navToRow(icao: string, nav: AwcAirportNav | undefined, fetchedAt: Date) {
  return nav
    ? {
        icao,
        found: true,
        faaId: nav.faaId,
        iataId: nav.iataId,
        name: nav.name,
        dataSource: nav.dataSource,
        latitudeDeg: nav.latitudeDeg,
        longitudeDeg: nav.longitudeDeg,
        elevationFt: nav.elevationFt,
        magneticVariationDeg: nav.magneticVariationDeg,
        hasTower: nav.hasTower,
        hasBeacon: nav.hasBeacon,
        runways: nav.runways as unknown as object,
        frequencies: nav.frequencies as unknown as object,
        fetchedAt,
      }
    : {
        icao,
        found: false,
        faaId: null,
        iataId: null,
        name: null,
        dataSource: null,
        latitudeDeg: null,
        longitudeDeg: null,
        elevationFt: null,
        magneticVariationDeg: null,
        hasTower: false,
        hasBeacon: false,
        runways: [],
        frequencies: [],
        fetchedAt,
      };
}

// Concurrent page loads for the same airport share one AWC request.
const inFlight = new Map<string, Promise<Map<string, AwcAirportNav>>>();

/**
 * Nav data for many airports: fresh cache entries as-is, the rest fetched from AWC in
 * batches and cached. If AWC is unreachable, stale entries are returned (marked `stale`)
 * and missing ones are simply absent — callers fall back to OurAirports.
 */
export async function getAirportNavDataMany(
  db: PrismaClient,
  icaos: string[],
  opts: { now?: number; fetchImpl?: typeof fetch } = {}
): Promise<Map<string, CachedAirportNav>> {
  const now = opts.now ?? Date.now();
  const codes = Array.from(new Set(icaos.map((c) => c.trim().toUpperCase()).filter(Boolean)));
  const result = new Map<string, CachedAirportNav>();
  if (codes.length === 0) return result;

  const rows = await db.airportNavData.findMany({ where: { icao: { in: codes } } });
  const byIcao = new Map(rows.map((r) => [r.icao, r]));
  const toFetch: string[] = [];
  for (const code of codes) {
    const row = byIcao.get(code);
    if (row && isFresh(row, now)) {
      const nav = rowToNav(row, false);
      if (nav) result.set(code, nav);
    } else {
      toFetch.push(code);
    }
  }
  if (toFetch.length === 0) return result;

  let fetched: Map<string, AwcAirportNav>;
  try {
    const key = toFetch.join(",");
    let pending = inFlight.get(key);
    if (!pending) {
      pending = fetchAwcAirports(toFetch, { fetchImpl: opts.fetchImpl });
      inFlight.set(key, pending);
      pending.finally(() => inFlight.delete(key)).catch(() => {});
    }
    fetched = await pending;
  } catch (e) {
    console.warn("[awc] airport nav fetch failed; using cached data where available", e);
    for (const code of toFetch) {
      const row = byIcao.get(code);
      const nav = row ? rowToNav(row, true) : null;
      if (nav) result.set(code, nav);
    }
    return result;
  }

  const fetchedAt = new Date(now);
  await Promise.all(
    toFetch.map((code) => {
      const data = navToRow(code, fetched.get(code), fetchedAt);
      return db.airportNavData.upsert({ where: { icao: code }, create: data, update: data });
    })
  ).catch((e) => console.warn("[awc] failed to cache nav data", e));

  for (const code of toFetch) {
    const nav = fetched.get(code);
    if (nav) result.set(code, { ...nav, fetchedAt, stale: false });
  }
  return result;
}

export async function getAirportNavData(
  db: PrismaClient,
  icao: string,
  opts?: { now?: number; fetchImpl?: typeof fetch }
): Promise<CachedAirportNav | null> {
  const code = icao.trim().toUpperCase();
  return (await getAirportNavDataMany(db, [code], opts)).get(code) ?? null;
}
