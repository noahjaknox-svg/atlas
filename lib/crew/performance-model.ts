/**
 * Type-level performance planning coefficients (Crew PerformanceModel).
 * Grids remain separate; this is slope/wind/climb reference data only.
 */

export type CrewClimbRef = {
  altitudeFt: number;
  minutes: number;
  fuelLb: number;
  nm: number;
};

/** Matches Crew app PerformanceModel wire shape (optional on TypeDTO). */
export type CrewPerformanceModel = {
  takeoffSlopePctPerPct: number;
  headwindFactorPerKt: number;
  tailwindFactorPerKt: number;
  landingSlopePctPerPct: number;
  landingRefFt: number;
  climbRefLow: CrewClimbRef;
  climbRefHigh: CrewClimbRef;
};

/** Org runway / alternate thresholds (Crew PolicyStore; bundled fallbacks). */
export type CrewSyncPolicy = {
  minRunwayFt: number;
  highElevationFt: number;
  highElevationMinRunwayFt: number;
  shortRunwayFt: number;
  midElevationFt: number;
  longRunwayFt: number;
  freeGreenElevationFt: number;
  tightMarginFt: number;
  alternateMinCeilingFt: number;
  alternateMinVisibilitySm: number;
  forecastLeadMinutes: number;
};

/** Crew PerformanceModel.kingAir350 */
export const B300_PERFORMANCE_MODEL: CrewPerformanceModel = {
  takeoffSlopePctPerPct: 0.08,
  headwindFactorPerKt: 0.008,
  tailwindFactorPerKt: 0.024,
  landingSlopePctPerPct: 0.05,
  landingRefFt: 2940,
  climbRefLow: { altitudeFt: 5000, minutes: 3, fuelLb: 54, nm: 8 },
  climbRefHigh: { altitudeFt: 25000, minutes: 16, fuelLb: 237, nm: 52 },
};

export const CREW_PERFORMANCE_MODEL_BY_CODE: Record<string, CrewPerformanceModel> =
  {
    B300: B300_PERFORMANCE_MODEL,
  };

export const CREW_SYNC_POLICY: CrewSyncPolicy = {
  minRunwayFt: 5000,
  highElevationFt: 6000,
  highElevationMinRunwayFt: 7000,
  shortRunwayFt: 6000,
  midElevationFt: 5000,
  longRunwayFt: 8000,
  freeGreenElevationFt: 3000,
  tightMarginFt: 1000,
  alternateMinCeilingFt: 2000,
  alternateMinVisibilitySm: 3,
  forecastLeadMinutes: 120,
};

function isClimbRef(v: unknown): v is CrewClimbRef {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.altitudeFt === "number" &&
    typeof o.minutes === "number" &&
    typeof o.fuelLb === "number" &&
    typeof o.nm === "number"
  );
}

/** Parse optional performanceModel from DB/import JSON; invalid → null. */
export function parsePerformanceModel(raw: unknown): CrewPerformanceModel | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.takeoffSlopePctPerPct !== "number" ||
    typeof o.headwindFactorPerKt !== "number" ||
    typeof o.tailwindFactorPerKt !== "number" ||
    typeof o.landingSlopePctPerPct !== "number" ||
    typeof o.landingRefFt !== "number" ||
    !isClimbRef(o.climbRefLow) ||
    !isClimbRef(o.climbRefHigh)
  ) {
    return null;
  }
  return {
    takeoffSlopePctPerPct: o.takeoffSlopePctPerPct,
    headwindFactorPerKt: o.headwindFactorPerKt,
    tailwindFactorPerKt: o.tailwindFactorPerKt,
    landingSlopePctPerPct: o.landingSlopePctPerPct,
    landingRefFt: o.landingRefFt,
    climbRefLow: { ...o.climbRefLow },
    climbRefHigh: { ...o.climbRefHigh },
  };
}

/** Prefer stored JSON; fall back to known type-code defaults (e.g. B300). */
export function resolvePerformanceModel(
  code: string,
  stored: unknown
): CrewPerformanceModel | undefined {
  const parsed = parsePerformanceModel(stored);
  if (parsed) return parsed;
  return CREW_PERFORMANCE_MODEL_BY_CODE[code];
}
