import type { AssumptionMap } from "@/lib/assumptions";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export type HangarPricingMode = "monthly" | "annual";

export function resolveHangarPricingMode(
  mode: string | undefined
): HangarPricingMode {
  return mode === "annual" ? "annual" : "monthly";
}

/** Annual hangar cost for pro forma (from monthly or total annual input). */
export function resolveHangarAnnual(a: AssumptionMap): number {
  const mode = resolveHangarPricingMode(a.hangar_pricing_mode);
  if (mode === "annual") {
    const annual = num(a.hangar_annual);
    if (annual > 0) return Math.round(annual);
    const monthly = num(a.hangar_monthly);
    return monthly > 0 ? Math.round(monthly * 12) : 0;
  }
  const monthly = num(a.hangar_monthly);
  if (monthly > 0) return Math.round(monthly * 12);
  return Math.round(num(a.hangar_annual));
}

export function hangarFieldActive(
  mode: string | undefined,
  fieldName: "hangar_monthly" | "hangar_annual"
): boolean {
  const m = resolveHangarPricingMode(mode);
  if (fieldName === "hangar_monthly") return m === "monthly";
  return m === "annual";
}
