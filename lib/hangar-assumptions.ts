import type { AssumptionMap } from "@/lib/assumptions";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export { WAREHOUSE_PULLED_KEYS, WAREHOUSE_SNAPSHOT_KEYS } from "@/lib/warehouse-assumption-seed";

const LEGACY_ESTIMATED_HANGAR_MONTHLY = "4500";
const LEGACY_ESTIMATED_HANGAR_ANNUAL = "54000";

/** Remove stale PrismJet estimate hangar values baked into old proposals. */
export function stripLegacyEstimatedHangar(
  assumptions: import("@/lib/assumptions").AssumptionMap
): import("@/lib/assumptions").AssumptionMap {
  const next = { ...assumptions };
  if (next.hangar_monthly?.trim() === LEGACY_ESTIMATED_HANGAR_MONTHLY) {
    delete next.hangar_monthly;
  }
  if (next.hangar_annual?.trim() === LEGACY_ESTIMATED_HANGAR_ANNUAL) {
    delete next.hangar_annual;
  }
  return next;
}

/** Annual hangar from square footage × FBO rate ($/sqft/yr). */
export function computeHangarCalculatedAnnual(a: AssumptionMap): number {
  const sqft = num(a.square_footage);
  const rate = num(a.hangar_cost_per_sqft);
  if (sqft <= 0 || rate <= 0) return 0;
  return Math.round(sqft * rate);
}

/** Annual hangar cost for pro forma (override, data-hub annual, or sqft × rate). */
export function resolveHangarAnnual(a: AssumptionMap): number {
  const override = num(a.hangar_annual);
  if (override > 0) return Math.round(override);

  const calculated = computeHangarCalculatedAnnual(a);
  if (calculated > 0) return calculated;

  const monthly = num(a.hangar_monthly);
  if (monthly > 0) return Math.round(monthly * 12);
  return 0;
}
