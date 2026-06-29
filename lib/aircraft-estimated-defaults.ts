import type { AssumptionMap } from "@/lib/assumptions";

/**
 * Legacy hook for code-only assumption fills. Prefer Data Hub company settings
 * (e.g. charter_block_to_flight_ratio on General and Company).
 */
export const CONSTANT_ASSUMPTION_DEFAULTS: Record<string, string> = {};

/** @deprecated Use CONSTANT_ASSUMPTION_DEFAULTS. Kept for legacy imports. */
export const ESTIMATED_DEFAULTS = CONSTANT_ASSUMPTION_DEFAULTS;

export function mergeEstimatedDefaults(map: Record<string, string>): Record<string, string> {
  const out = { ...map };
  for (const [k, v] of Object.entries(CONSTANT_ASSUMPTION_DEFAULTS)) {
    if (!out[k]?.trim()) out[k] = v;
  }
  return out;
}

export function applyEstimatedDefaultsToAssumptions(
  assumptions: AssumptionMap,
  defaults: Record<string, string>
): AssumptionMap {
  const merged = mergeEstimatedDefaults(defaults);
  const next: AssumptionMap = { ...assumptions };
  for (const [key, def] of Object.entries(merged)) {
    if (!next[key]?.trim() && def.trim()) {
      next[key] = def;
    }
  }
  return next;
}
