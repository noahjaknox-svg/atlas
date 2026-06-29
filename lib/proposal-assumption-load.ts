import type { AssumptionMap } from "@/lib/assumptions";
import {
  aircraftAssumptionCategory,
  mergeLegacyAssumptions,
  META_ASSUMPTION_KEYS,
  LEGACY_CATEGORIES,
} from "@/lib/aircraft-workspace";

export type AssumptionRow = {
  category: string;
  assumptionName: string;
  value: string;
};

/** Fill missing META keys from legacy categories when per-aircraft rows omit them. */
export function overlayLegacyMetaAssumptionKeys(
  map: AssumptionMap,
  assumptionRows: AssumptionRow[]
): AssumptionMap {
  const legacy: AssumptionMap = {};
  for (const row of assumptionRows) {
    if (!(LEGACY_CATEGORIES as readonly string[]).includes(row.category)) continue;
    legacy[row.assumptionName] = row.value;
  }
  const out: AssumptionMap = { ...map };
  for (const key of META_ASSUMPTION_KEYS) {
    if (out[key]?.trim()) continue;
    const legacyValue = legacy[key]?.trim();
    if (legacyValue) out[key] = legacyValue;
  }
  return out;
}

/**
 * Load stored proposal assumptions for one aircraft instance.
 * Prefer per-aircraft `ac_{id}` rows; fall back to legacy categories only when ac is empty.
 */
export function mergeAssumptionRowsForInstance(
  assumptionRows: AssumptionRow[],
  aircraftInstanceId: string | null,
  options?: { alternateInstanceId?: string | null }
): AssumptionMap {
  const primaryId =
    aircraftInstanceId && aircraftInstanceId !== "legacy-primary"
      ? aircraftInstanceId
      : null;
  const alternateId =
    options?.alternateInstanceId &&
    options.alternateInstanceId !== "legacy-primary" &&
    options.alternateInstanceId !== primaryId
      ? options.alternateInstanceId
      : null;

  if (primaryId) {
    const map = mergeLegacyAssumptions(
      assumptionRows,
      aircraftAssumptionCategory(primaryId)
    );
    if (Object.keys(map).length > 0) {
      return overlayLegacyMetaAssumptionKeys(map, assumptionRows);
    }
  }

  if (alternateId) {
    const map = mergeLegacyAssumptions(
      assumptionRows,
      aircraftAssumptionCategory(alternateId)
    );
    if (Object.keys(map).length > 0) {
      return overlayLegacyMetaAssumptionKeys(map, assumptionRows);
    }
  }

  return mergeLegacyAssumptions(assumptionRows, "__legacy__");
}

/** Primary aircraft on proposal when instance id is legacy-primary or missing. */
export function mergeAssumptionRowsForPrimaryLegacy(
  assumptionRows: AssumptionRow[],
  primaryAircraftInstanceId: string | null
): AssumptionMap {
  if (primaryAircraftInstanceId) {
    const map = mergeAssumptionRowsForInstance(assumptionRows, primaryAircraftInstanceId);
    if (Object.keys(map).length > 0) return map;
  }
  return mergeLegacyAssumptions(assumptionRows, "__legacy__");
}
