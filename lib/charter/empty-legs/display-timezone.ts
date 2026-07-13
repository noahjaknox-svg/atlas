import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";
import { lookupFallbackTimezone } from "@/lib/schedule/airport-timezone-format";

export type EmptyLegTimezoneConfidence = "high" | "medium" | "low" | "unknown";
export type EmptyLegTimezoneSource = "geo_tz" | "fallback_map" | "override" | "none";

export type EmptyLegTimezoneResolution = {
  /** IANA zone when known; null when Atlas cannot confidently resolve. */
  timeZone: string | null;
  confidence: EmptyLegTimezoneConfidence;
  source: EmptyLegTimezoneSource;
};

export type EmptyLegTimezoneLayers = {
  /** Manual staff overrides keyed by ICAO / FAA LID. */
  overridesByIcao?: Record<string, string>;
  /** Zones from AirportReference coordinates + geo-tz (no UTC fill). */
  geoByIcao?: Record<string, string>;
};

function lookupInMap(
  depIcao: string,
  map?: Record<string, string>
): string | null {
  if (!map) return null;
  const upper = depIcao.trim().toUpperCase();
  for (const key of [upper, airportCodeKey(upper), toIcaoDisplay(upper)]) {
    const tz = map[key];
    if (tz && tz !== "UTC") return tz;
  }
  return null;
}

/**
 * Resolve empty-leg display timezone from the departure airport.
 * Never returns UTC as a pretend “local” zone — unknown stays null.
 */
export function resolveEmptyLegDepartureTimezone(
  depIcao?: string | null,
  layers?: EmptyLegTimezoneLayers
): EmptyLegTimezoneResolution {
  if (!depIcao?.trim()) {
    return { timeZone: null, confidence: "unknown", source: "none" };
  }

  const override = lookupInMap(depIcao, layers?.overridesByIcao);
  if (override) {
    return { timeZone: override, confidence: "high", source: "override" };
  }

  const geo = lookupInMap(depIcao, layers?.geoByIcao);
  if (geo) {
    return { timeZone: geo, confidence: "high", source: "geo_tz" };
  }

  const fallback = lookupFallbackTimezone(depIcao);
  if (fallback) {
    return { timeZone: fallback, confidence: "medium", source: "fallback_map" };
  }

  return { timeZone: null, confidence: "unknown", source: "none" };
}

export function isEmptyLegTimezoneConfident(
  resolution: Pick<EmptyLegTimezoneResolution, "confidence" | "timeZone">
): boolean {
  return (
    resolution.timeZone != null &&
    resolution.confidence !== "unknown" &&
    resolution.confidence !== "low"
  );
}
