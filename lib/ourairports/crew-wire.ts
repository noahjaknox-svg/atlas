import type {
  AirportFrequencyReference,
  AirportReference,
  AirportRunwayReference,
} from "@prisma/client";
import { decimalToNumber } from "@/lib/ourairports/lookup-utils";

type AirportWithRelations = AirportReference & {
  runways: AirportRunwayReference[];
  frequencies: AirportFrequencyReference[];
};

export type CrewAirportRunwayWire = {
  runwayId: string | null;
  lengthFt: number | null;
  widthFt: number | null;
  surface: string | null;
  lighted: boolean;
  closed: boolean;
  gradientPct: number | null;
  gradientHighEndRunway: string | null;
  leIdent: string | null;
  heIdent: string | null;
};

/** Crew iOS parser shape for GET /api/v1/crew/airports */
export type CrewAirportWire = {
  /** ICAO code (four-letter identifier). */
  id: string;
  name: string;
  city: string | null;
  elevationFt: number | null;
  longestRunwayFt: number | null;
  /** Primary (longest open) runway designator, e.g. "03/21". */
  runwayId: string | null;
  lat: number | null;
  lon: number | null;
  /** Slope magnitude on primary runway (%). */
  gradientPct: number | null;
  /** Runway end ident on the high side of primary runway, e.g. "03". */
  gradientHighEndRunway: string | null;
  /** True when slope or airport context warrants terrain correction in Crew. */
  terrain: boolean;
  /** True when more than one open runway exists. */
  multiRunway: boolean;
  updatedAt: string;
  runways: CrewAirportRunwayWire[];
};

export type CrewAirportsPayload = {
  syncedAt: string;
  count: number;
  unchanged?: boolean;
  airports: CrewAirportWire[];
};

const TERRAIN_GRADIENT_PCT = 0.5;

function runwayDesignator(le: string | null, he: string | null): string | null {
  if (le && he) return `${le}/${he}`;
  return le ?? he ?? null;
}

/** Verified slope served to Crew; null when unverified (app treats as level). */
export function servedRunwayGradient(runway: AirportRunwayReference): {
  gradientPct: number | null;
  gradientHighEndRunway: string | null;
} {
  return {
    gradientPct: runway.gradientPctVerified ?? null,
    gradientHighEndRunway: runway.gradientHighEndVerified ?? null,
  };
}

function serializeRunway(runway: AirportRunwayReference): CrewAirportRunwayWire {
  const { gradientPct, gradientHighEndRunway } = servedRunwayGradient(runway);
  return {
    runwayId: runwayDesignator(runway.leIdent, runway.heIdent),
    lengthFt: runway.lengthFt,
    widthFt: runway.widthFt,
    surface: runway.surface,
    lighted: runway.lighted,
    closed: runway.closed,
    gradientPct,
    gradientHighEndRunway,
    leIdent: runway.leIdent,
    heIdent: runway.heIdent,
  };
}

function isTerrainAirport(
  airport: AirportReference,
  verifiedGradientPct: number | null,
  openRunwayCount: number
): boolean {
  if (verifiedGradientPct != null && verifiedGradientPct >= TERRAIN_GRADIENT_PCT) {
    return true;
  }

  const haystack = `${airport.name} ${airport.keywords ?? ""}`.toLowerCase();
  if (
    /sedona|mountain|canyon|mesa|plateau|ridgeline|ridge|butte|mesa|alpine|mesa/i.test(
      haystack
    )
  ) {
    return true;
  }

  // High-elevation single-runway fields often need terrain handling in Crew.
  if (
    openRunwayCount === 1 &&
    airport.elevationFt != null &&
    airport.elevationFt >= 4000 &&
    verifiedGradientPct != null &&
    verifiedGradientPct >= 0.25
  ) {
    return true;
  }

  return false;
}

export function serializeCrewAirport(airport: AirportWithRelations): CrewAirportWire {
  const icao = airport.icao ?? airport.ident;
  const openRunways = airport.runways
    .filter((r) => !r.closed)
    .sort((a, b) => (b.lengthFt ?? 0) - (a.lengthFt ?? 0));

  const primary = openRunways[0] ?? null;
  const primaryGradient = primary ? servedRunwayGradient(primary) : null;

  return {
    id: icao,
    name: airport.name,
    city: airport.municipality,
    elevationFt: airport.elevationFt,
    longestRunwayFt: airport.longestRunwayFt,
    runwayId: primary ? runwayDesignator(primary.leIdent, primary.heIdent) : null,
    lat: decimalToNumber(airport.latitudeDeg),
    lon: decimalToNumber(airport.longitudeDeg),
    gradientPct: primaryGradient?.gradientPct ?? null,
    gradientHighEndRunway: primaryGradient?.gradientHighEndRunway ?? null,
    terrain: isTerrainAirport(
      airport,
      primaryGradient?.gradientPct ?? null,
      openRunways.length
    ),
    multiRunway: openRunways.length > 1,
    updatedAt: airport.updatedAt.toISOString(),
    runways: airport.runways
      .filter((r) => !r.closed)
      .sort((a, b) => (b.lengthFt ?? 0) - (a.lengthFt ?? 0))
      .map(serializeRunway),
  };
}
