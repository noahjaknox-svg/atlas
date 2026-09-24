import type {
  AirportFrequencyWire,
  AirportReferenceWire,
  AirportRunwayWire,
} from "@/lib/ourairports/types";
import type { CachedAirportNav } from "@/lib/awc/nav-data";

/** "03" and "3" are the same runway end; compare without leading zeros, upper-cased. */
function endKey(ident: string | null | undefined): string {
  return (ident ?? "").trim().toUpperCase().replace(/^0+(?=\d)/, "");
}

function runwayKey(le: string | null | undefined, he: string | null | undefined): string {
  return [endKey(le), endKey(he)].sort().join("/");
}

/**
 * Merge aviationweather.gov nav data over the OurAirports record.
 *
 * AWC (FAA-sourced in the US) wins for elevation, runway length/width/surface/heading and
 * frequencies. OurAirports keeps identity, location metadata, lighting/closed flags and
 * runway gradients (AWC has no runway-end elevations), and fills any runway AWC doesn't
 * list. Pure — callers decide when nav data is available.
 */
export function applyAwcNavData(
  wire: AirportReferenceWire,
  nav: CachedAirportNav | null | undefined
): AirportReferenceWire {
  if (!nav) return { ...wire, nav: null };

  const awcByKey = new Map(nav.runways.map((r) => [runwayKey(r.leIdent, r.heIdent), r]));
  const matched = new Set<string>();

  const runways: AirportRunwayWire[] = wire.runways.map((r) => {
    const key = runwayKey(r.leIdent, r.heIdent);
    const awc = awcByKey.get(key);
    if (!awc) return { ...r, source: "ourairports" };
    matched.add(key);
    // Keep OurAirports' end order; AWC's heading is for its own first end.
    const sameOrder = endKey(awc.leIdent) === endKey(r.leIdent);
    return {
      ...r,
      lengthFt: awc.lengthFt ?? r.lengthFt,
      widthFt: awc.widthFt ?? r.widthFt,
      surface: awc.surface ?? r.surface,
      leHeadingDegT: (sameOrder ? awc.leHeadingDegT : awc.heHeadingDegT) ?? r.leHeadingDegT,
      heHeadingDegT: (sameOrder ? awc.heHeadingDegT : awc.leHeadingDegT) ?? r.heHeadingDegT,
      source: "aviationweather.gov",
    };
  });

  for (const awc of nav.runways) {
    const key = runwayKey(awc.leIdent, awc.heIdent);
    if (matched.has(key)) continue;
    runways.push({
      lengthFt: awc.lengthFt,
      widthFt: awc.widthFt,
      surface: awc.surface,
      lighted: false,
      closed: false,
      leIdent: awc.leIdent,
      heIdent: awc.heIdent,
      leHeadingDegT: awc.leHeadingDegT,
      heHeadingDegT: awc.heHeadingDegT,
      gradientPctVerified: null,
      gradientHighEndVerified: null,
      gradientPctEstimated: null,
      source: "aviationweather.gov",
    });
  }

  const frequencies: AirportFrequencyWire[] =
    nav.frequencies.length > 0
      ? nav.frequencies.map((f) => ({ type: f.type, description: null, frequencyMhz: f.frequencyMhz }))
      : wire.frequencies;

  // Longest usable runway (helipads and closed runways don't count).
  const lengths = runways
    .filter((r) => !r.closed && !/^H\d*$/i.test(r.leIdent ?? ""))
    .map((r) => r.lengthFt)
    .filter((n): n is number => n != null);

  return {
    ...wire,
    elevationFt: nav.elevationFt ?? wire.elevationFt,
    longestRunwayFt: lengths.length > 0 ? Math.max(...lengths) : wire.longestRunwayFt,
    runways,
    frequencies,
    nav: {
      provider: "aviationweather.gov",
      dataSource: nav.dataSource,
      fetchedAt: nav.fetchedAt.toISOString(),
      stale: nav.stale,
      faaId: nav.faaId,
      magneticVariationDeg: nav.magneticVariationDeg,
      hasTower: nav.hasTower,
      hasBeacon: nav.hasBeacon,
    },
  };
}
