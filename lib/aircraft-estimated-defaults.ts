import type { AssumptionMap } from "@/lib/assumptions";
import { DEFAULT_BLOCK_TO_FLIGHT_FACTOR } from "@/lib/proforma-utilization";

/**
 * Constants with no Data Hub source. Not merged into warehouse Pulled/Default —
 * only used where pro forma math needs a fallback when the workspace left a field empty.
 */
export const CONSTANT_ASSUMPTION_DEFAULTS: Record<string, string> = {
  charter_block_to_flight_ratio: String(DEFAULT_BLOCK_TO_FLIGHT_FACTOR),
};

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
