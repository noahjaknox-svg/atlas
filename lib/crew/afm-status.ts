import type { AircraftPerformanceMetric } from "@prisma/client";

export type AfmStatus = "complete" | "partial" | "missing";

export type AfmStatusResult = {
  afmStatus: AfmStatus;
  afmNotes?: string;
};

function isPohSource(source: string | null | undefined): boolean {
  if (!source?.trim()) return false;
  const s = source.toLowerCase();
  if (/stand-?in|calibrat|density-altitude|synthetic|formula|bundled/.test(s)) {
    return false;
  }
  return /poh|afm|section\s*5|normal\s+landing|normal\s+takeoff/.test(s);
}

function isStandInSource(source: string | null | undefined): boolean {
  if (!source?.trim()) return false;
  return /stand-?in|calibrat|density-altitude|synthetic|formula/.test(
    source.toLowerCase()
  );
}

/**
 * Derive AFM completeness for Crew picker / Trip Check gating.
 * complete = both grids + performanceModel and POH-sourced grids.
 * partial = some pieces present (or stand-in landing).
 * missing = no usable AFM data.
 */
export function deriveAfmStatus(input: {
  code: string;
  hasPerformanceModel: boolean;
  grids: Array<{ metric: AircraftPerformanceMetric | string; source?: string | null }>;
  storedAfmNotes?: string | null;
}): AfmStatusResult {
  const notes: string[] = [];
  if (input.storedAfmNotes?.trim()) notes.push(input.storedAfmNotes.trim());

  const takeoff = input.grids.find(
    (g) => g.metric === "takeoffFieldLength" || g.metric === "takeoff_field_length"
  );
  const landing = input.grids.find(
    (g) => g.metric === "landingDistance" || g.metric === "landing_distance"
  );

  const hasTakeoff = Boolean(takeoff);
  const hasLanding = Boolean(landing);
  const hasModel = input.hasPerformanceModel;

  if (!hasTakeoff && !hasLanding && !hasModel) {
    return { afmStatus: "missing", ...(notes[0] ? { afmNotes: notes.join("; ") } : {}) };
  }

  const takeoffPoh = hasTakeoff && isPohSource(takeoff?.source);
  const landingPoh = hasLanding && isPohSource(landing?.source);
  const landingStandIn = hasLanding && isStandInSource(landing?.source);

  if (landingStandIn && !notes.some((n) => /stand-?in|calibrat/i.test(n))) {
    notes.push("landing stand-in; not POH");
  }
  if (hasTakeoff && !takeoff?.source && !notes.some((n) => /takeoff/i.test(n))) {
    notes.push("takeoff grid present (source unspecified)");
  }
  if (hasLanding && !landing?.source && !landingStandIn) {
    notes.push("landing grid present (source unspecified)");
  }
  if (!hasModel) notes.push("performanceModel missing");
  if (!hasTakeoff) notes.push("takeoff grid missing");
  if (!hasLanding) notes.push("landing grid missing");

  const complete =
    hasModel &&
    hasTakeoff &&
    hasLanding &&
    takeoffPoh &&
    landingPoh &&
    !landingStandIn;

  if (complete) {
    return {
      afmStatus: "complete",
      ...(notes.length ? { afmNotes: notes.join("; ") } : {}),
    };
  }

  // Any piece present → partial (including B300 with stand-in landing)
  if (hasTakeoff || hasLanding || hasModel) {
    return {
      afmStatus: "partial",
      ...(notes.length ? { afmNotes: notes.join("; ") } : {}),
    };
  }

  return { afmStatus: "missing" };
}
