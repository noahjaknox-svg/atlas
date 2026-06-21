import { normalizeAirportCode } from "@/lib/ourairports/normalize-code";
import type { AirportSearchHit } from "@/lib/ourairports/types";

export function formatAirportSearchLabel(hit: Pick<AirportSearchHit, "icao" | "name" | "municipality">): string {
  const code = hit.icao;
  const place = hit.municipality ? `, ${hit.municipality}` : "";
  return `${code} — ${hit.name}${place}`;
}

export function formatAirportSearchResult(hit: AirportSearchHit) {
  return {
    id: hit.ident,
    icao: hit.icao,
    label: formatAirportSearchLabel(hit),
    airportName: hit.name,
    city: hit.municipality,
    state: null,
    iata: hit.iata,
    type: hit.type,
    isoCountry: hit.isoCountry,
    source: "ourairports" as const,
  };
}

const US_BOOST = 200;
const EXACT_CODE = 1000;
const FAA_LID_MATCH = 900;
const PREFIX_CODE = 500;
const LARGE_AIRPORT = 50;
const MEDIUM_AIRPORT = 30;
const SMALL_AIRPORT = 10;

function airportCodes(hit: AirportSearchHit): string[] {
  return [hit.icao, hit.ident, hit.iata]
    .filter((c): c is string => Boolean(c))
    .map((c) => normalizeAirportCode(c));
}

function scoreHit(query: string, hit: AirportSearchHit): number {
  const upper = normalizeAirportCode(query);
  const codes = airportCodes(hit);
  let score = 0;

  if (codes.some((c) => c === upper)) {
    score += EXACT_CODE;
  } else if (
    upper.length === 3 &&
    codes.some((c) => c === `K${upper}`)
  ) {
    score += FAA_LID_MATCH;
  } else if (
    upper.length === 4 &&
    upper.startsWith("K") &&
    codes.some((c) => c === upper.slice(1))
  ) {
    score += FAA_LID_MATCH;
  } else if (codes.some((c) => c.startsWith(upper) || upper.startsWith(c))) {
    score += PREFIX_CODE;
  }

  if (hit.isoCountry === "US") score += US_BOOST;

  if (hit.type === "large_airport") score += LARGE_AIRPORT;
  else if (hit.type === "medium_airport") score += MEDIUM_AIRPORT;
  else if (hit.type === "small_airport") score += SMALL_AIRPORT;

  return score;
}

export function rankAirportSearchHits(
  query: string,
  hits: AirportSearchHit[]
): AirportSearchHit[] {
  return [...hits].sort((a, b) => {
    const diff = scoreHit(query, b) - scoreHit(query, a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export const DEFAULT_CHARTER_DEPARTURE = {
  icao: "KSDL",
  label: "KSDL — Scottsdale Airport, Scottsdale",
} as const;
