import type { AssumptionMap } from "@/lib/assumptions";
import {
  computeCabinCrewTotal,
  computeCrewTotal,
  computeCrewTrainingTotalAmount,
  computePicCrewTotal,
  computePicTrainingTotal,
  computeSicCrewTotal,
  computeSicTrainingTotal,
  mergeWithDerived,
} from "@/lib/aircraft-calculated-fields";
import { isCharterUsageEnabled } from "@/lib/usage-type";

/** Keys cleared to "0" for Part 91 — restore from defaults when charter is enabled again. */
const CHARTER_ZERO_RESTORE_KEYS = new Set([
  "max_annual_utilization",
  "charter_rate",
  "charter_payback_pct",
  "fuel_surcharge",
  "pilot_charter_incentive_per_hour",
]);

/** Stored override if set, otherwise pulled/default. */
export function resolvedAssumptionValue(
  assumptions: AssumptionMap,
  defaults: Record<string, string>,
  key: string
): string {
  const stored = assumptions[key]?.trim();
  if (stored) return stored;
  return defaults[key]?.trim() ?? "";
}

/** Fill empty assumption keys from defaults before formulas run. */
export function mergeAssumptionsWithDefaults(
  assumptions: AssumptionMap,
  defaults: Record<string, string>
): AssumptionMap {
  const merged: AssumptionMap = { ...assumptions };
  for (const [key, def] of Object.entries(defaults)) {
    const d = def?.trim();
    if (!d) continue;
    const stored = merged[key]?.trim();
    if (!stored) {
      merged[key] = d;
      continue;
    }
    const storedZero = stored === "0" || stored === "0.0";
    const defaultPositive = parseFloat(d) > 0;
    if (storedZero && defaultPositive) {
      if (key === "max_annual_utilization") {
        merged[key] = d;
        continue;
      }
      if (CHARTER_ZERO_RESTORE_KEYS.has(key) && isCharterUsageEnabled(merged)) {
        merged[key] = d;
      }
    }
  }
  return merged;
}

/** Defaults + derived fields used for P&L, footers, and read-only formula rows. */
export function buildEffectiveAssumptions(
  assumptions: AssumptionMap,
  defaults: Record<string, string>
): AssumptionMap {
  return mergeWithDerived(mergeAssumptionsWithDefaults(assumptions, defaults));
}

const CALCULATED_DISPLAY: Record<string, (a: AssumptionMap) => number> = {
  pic_crew_total: computePicCrewTotal,
  sic_crew_total: computeSicCrewTotal,
  cabin_crew_total: computeCabinCrewTotal,
  crew_total: computeCrewTotal,
  pic_training_total: computePicTrainingTotal,
  sic_training_total: computeSicTrainingTotal,
  crew_training_total: computeCrewTrainingTotalAmount,
};

/** Numeric value for a derived key (always recomputed from resolved inputs). */
export function calculatedAssumptionAmount(
  effective: AssumptionMap,
  valueKey: string
): number | null {
  const fn = CALCULATED_DISPLAY[valueKey];
  if (fn) {
    const n = fn(effective);
    return Number.isFinite(n) ? n : null;
  }
  const raw = parseFloat(effective[valueKey] ?? "");
  return Number.isFinite(raw) ? raw : null;
}
