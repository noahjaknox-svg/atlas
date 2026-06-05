import type { AssumptionMap } from "@/lib/assumptions";
import { isCharterUsageEnabled } from "@/lib/usage-type";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

function fmt(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return String(r);
}

/** Default block-to-flight factor (revenue hours per available charter flight hour). */
export const DEFAULT_BLOCK_TO_FLIGHT_FACTOR = 1.13;

/** @deprecated Alias for DEFAULT_BLOCK_TO_FLIGHT_FACTOR */
export const DEFAULT_BLOCK_TO_FLIGHT_RATIO = DEFAULT_BLOCK_TO_FLIGHT_FACTOR;

export type UtilizationProfile = {
  maxAnnualUsage: number;
  ownerFlightHours: number;
  availableCharterFlightHours: number;
  blockToFlightFactor: number;
  charterRevenueHours: number;
  /** @deprecated Use availableCharterFlightHours */
  charterRemainingBlock: number;
  /** Persisted as charter_block_hours — Charter Revenue Hours */
  charterBlockHours: number;
  /** Persisted as charter_flight_hours — Available Charter Flight Hours */
  charterFlightHours: number;
  /** @deprecated Use blockToFlightFactor */
  blockToFlightRatio: number;
  blockFlightDeltaHours: number;
  blockFlightDeltaPct: number;
  charterDerivedFromMax: boolean;
  /** @deprecated Use maxAnnualUsage */
  maxAnnualUtilization: number;
  /** @deprecated Use ownerFlightHours */
  ownerHours: number;
};

/** Block-to-Flight Factor from assumptions (stored key unchanged for DB compat). */
export function resolveBlockToFlightFactor(a: AssumptionMap): number {
  const stored = num(a.charter_block_to_flight_ratio);
  if (stored > 0) return stored;

  const revenueHours = num(a.charter_block_hours);
  const available = num(a.charter_flight_hours);
  if (available > 0 && revenueHours > 0) {
    return revenueHours / available;
  }

  return DEFAULT_BLOCK_TO_FLIGHT_FACTOR;
}

/** @deprecated Use resolveBlockToFlightFactor */
export const resolveBlockToFlightRatio = resolveBlockToFlightFactor;

/**
 * Industry utilization model:
 * - Available Charter Flight Hours = Max Annual Usage − Owner Flight Hours
 * - Charter Revenue Hours = Available Charter Flight Hours × Block-to-Flight Factor
 */
export function computeUtilizationProfile(a: AssumptionMap): UtilizationProfile {
  const max = num(a.max_annual_utilization);
  const owner = num(a.owner_annual_hours);
  const factor = resolveBlockToFlightFactor(a);

  let available: number;
  let revenueHours: number;
  let derivedFromMax = false;

  if (max > 0) {
    derivedFromMax = true;
    available = Math.max(0, max - owner);
    revenueHours = available * factor;
  } else {
    available = num(a.charter_flight_hours);
    revenueHours = num(a.charter_block_hours);
    if (revenueHours <= 0 && available > 0) {
      revenueHours = available * factor;
    }
    if (available <= 0 && revenueHours > 0 && factor > 0) {
      available = revenueHours / factor;
    }
  }

  const blockFlightDeltaHours = revenueHours - available;
  const blockFlightDeltaPct =
    available > 0 ? (blockFlightDeltaHours / available) * 100 : 0;

  return {
    maxAnnualUsage: max,
    ownerFlightHours: owner,
    availableCharterFlightHours: available,
    blockToFlightFactor: factor,
    charterRevenueHours: revenueHours,
    charterRemainingBlock: available,
    charterBlockHours: revenueHours,
    charterFlightHours: available,
    blockToFlightRatio: factor,
    blockFlightDeltaHours,
    blockFlightDeltaPct,
    charterDerivedFromMax: derivedFromMax,
    maxAnnualUtilization: max,
    ownerHours: owner,
  };
}

/** Apply utilization rules; syncs persisted hour keys used by APIs. */
export function syncUtilizationHours(a: AssumptionMap): AssumptionMap {
  const charterEnabled = isCharterUsageEnabled(a);
  const base: AssumptionMap = charterEnabled
    ? a
    : {
        ...a,
        charter_block_hours: "0",
        charter_flight_hours: "0",
      };
  const p = computeUtilizationProfile(base);
  return {
    ...base,
    owner_annual_hours: fmt(p.ownerFlightHours),
    charter_block_hours: fmt(charterEnabled ? p.charterRevenueHours : 0),
    charter_flight_hours: fmt(charterEnabled ? p.availableCharterFlightHours : 0),
    charter_block_to_flight_ratio: fmt(p.blockToFlightFactor, 4),
  };
}

export type UtilizationPatch = {
  maxAnnualUtilization?: number;
  ownerHours?: number;
  blockToFlightRatio?: number;
  blockToFlightFactor?: number;
  charterBlockHours?: number;
  charterFlightHours?: number;
};

/** Build assumption patch from pro forma utilization panel edits. */
export function utilizationPatchToAssumptions(
  current: AssumptionMap,
  patch: UtilizationPatch
): AssumptionMap {
  const next: AssumptionMap = { ...current };
  if (patch.maxAnnualUtilization !== undefined) {
    next.max_annual_utilization = fmt(patch.maxAnnualUtilization);
  }
  if (patch.ownerHours !== undefined) {
    next.owner_annual_hours = fmt(patch.ownerHours);
  }
  const factor = patch.blockToFlightFactor ?? patch.blockToFlightRatio;
  if (factor !== undefined && factor > 0) {
    next.charter_block_to_flight_ratio = fmt(factor, 4);
  }
  if (patch.charterFlightHours !== undefined) {
    next.charter_flight_hours = fmt(patch.charterFlightHours);
    const ratio = resolveBlockToFlightFactor(next);
    if (patch.charterFlightHours > 0) {
      next.charter_block_hours = fmt(patch.charterFlightHours * ratio);
    }
  }
  if (patch.charterBlockHours !== undefined) {
    next.charter_block_hours = fmt(patch.charterBlockHours);
    const ratio = resolveBlockToFlightFactor(next);
    if (patch.charterBlockHours > 0 && ratio > 0) {
      next.charter_flight_hours = fmt(patch.charterBlockHours / ratio);
    }
  }
  return syncUtilizationHours(next);
}
