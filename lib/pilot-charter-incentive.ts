import type { AssumptionMap } from "@/lib/assumptions";
import { isCharterUsageEnabled } from "@/lib/usage-type";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/** Annual pilot charter incentive from $/charter flight hour × charter flight hours. */
export function computePilotCharterIncentiveAnnual(
  assumptions: AssumptionMap,
  charterFlightHours: number
): number {
  if (!isCharterUsageEnabled(assumptions) || charterFlightHours <= 0) return 0;

  const rate = num(assumptions.pilot_charter_incentive_per_hour);
  if (rate > 0) return Math.round(rate * charterFlightHours);

  const legacyAnnual = num(assumptions.pilot_charter_incentive);
  return legacyAnnual > 0 ? Math.round(legacyAnnual) : 0;
}
