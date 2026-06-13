import type { AirportRunwayReference } from "@prisma/client";

/** Normalize runway end idents for matching (e.g. "03" ↔ "3"). */
export function normalizeRunwayEndIdent(ident: string): string {
  const trimmed = ident.trim().toUpperCase();
  if (/^\d+$/.test(trimmed)) {
    return String(parseInt(trimmed, 10));
  }
  return trimmed;
}

export function runwayEndMatches(
  runwayEnd: string | null | undefined,
  target: string
): boolean {
  if (!runwayEnd) return false;
  const a = runwayEnd.trim().toUpperCase();
  const b = target.trim().toUpperCase();
  if (a === b) return true;
  if (normalizeRunwayEndIdent(a) === normalizeRunwayEndIdent(b)) return true;

  // "3" matches "03", "03R", "03L", etc.
  if (/^\d+$/.test(b)) {
    const targetNum = parseInt(b, 10);
    const runwayNum = parseInt(a.replace(/[^0-9].*$/, ""), 10);
    if (!Number.isNaN(runwayNum) && runwayNum === targetNum) return true;
  }

  return false;
}

/** OurAirports end-elevation estimate — admin reference only, not served to Crew. */
export function computeRunwayGradientEstimated(
  runway: Pick<
    AirportRunwayReference,
    "lengthFt" | "leElevationFt" | "heElevationFt" | "leIdent" | "heIdent"
  >
): number | null {
  const { lengthFt, leElevationFt, heElevationFt } = runway;
  if (
    lengthFt == null ||
    lengthFt <= 0 ||
    leElevationFt == null ||
    heElevationFt == null
  ) {
    return null;
  }

  const delta = Math.abs(leElevationFt - heElevationFt);
  return Math.round((delta / lengthFt) * 100 * 100) / 100;
}

export function computeRunwayGradientHighEndEstimated(
  runway: Pick<AirportRunwayReference, "leElevationFt" | "heElevationFt" | "leIdent" | "heIdent">
): string | null {
  const { leElevationFt, heElevationFt, leIdent, heIdent } = runway;
  if (leElevationFt == null || heElevationFt == null) return null;
  if (leElevationFt > heElevationFt) return leIdent;
  if (heElevationFt > leElevationFt) return heIdent;
  return null;
}

export function findRunwayByHighEnd(
  runways: AirportRunwayReference[],
  highEndRunway: string
): AirportRunwayReference | undefined {
  const sorted = [...runways].sort((a, b) => (b.lengthFt ?? 0) - (a.lengthFt ?? 0));
  return sorted.find(
    (r) =>
      runwayEndMatches(r.leIdent, highEndRunway) ||
      runwayEndMatches(r.heIdent, highEndRunway)
  );
}
