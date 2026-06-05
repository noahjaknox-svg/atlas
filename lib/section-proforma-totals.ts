import type { AssumptionMap } from "@/lib/assumptions";
import { formatCurrency } from "@/lib/utils";
import type { SectionProFormaRollup } from "@/lib/aircraft-tab-fields";
import { calculateProForma, assumptionsToProFormaInputs } from "@/lib/proforma";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import { computeTotalFixedFromAssumptions } from "@/lib/proforma";
import { proFormaLineAmount } from "@/lib/proforma-line-amounts";
import { calculatedAssumptionAmount } from "@/lib/resolve-effective-assumptions";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export type SectionTotalDisplay = {
  label: string;
  formatted: string;
  proFormaHint?: string;
};

export function computeSectionProFormaTotal(
  rollup: SectionProFormaRollup | undefined,
  effective: AssumptionMap
): SectionTotalDisplay | null {
  if (!rollup) return null;

  const synced = syncUtilizationHours(effective);

  if (rollup.type === "lines" && rollup.proformaLines?.length) {
    let total = 0;
    let any = false;
    for (const key of rollup.proformaLines) {
      const amt = proFormaLineAmount(synced, key);
      if (amt != null) {
        total += amt;
        any = true;
      }
    }
    if (!any) return null;
    return {
      label: rollup.label,
      formatted: formatCurrency(total),
      proFormaHint: rollup.proFormaHint,
    };
  }

  if (rollup.type === "line" && rollup.proformaLine) {
    const amt = proFormaLineAmount(synced, rollup.proformaLine);
    if (amt == null) return null;
    let hint = rollup.proFormaHint;
    if (rollup.proformaLineOwner) {
      const ownerAmt = proFormaLineAmount(synced, rollup.proformaLineOwner);
      if (ownerAmt != null) {
        hint = hint
          ? `${hint} · Owner: ${formatCurrency(ownerAmt)}`
          : `Owner flight cost: ${formatCurrency(ownerAmt)}`;
      }
    }
    return {
      label: rollup.label,
      formatted: formatCurrency(amt),
      proFormaHint: hint,
    };
  }

  if (rollup.type === "proforma") {
    const inputs = assumptionsToProFormaInputs(synced);
    inputs.totalFixedCosts = computeTotalFixedFromAssumptions(synced);
    const result = calculateProForma(inputs);
    const value =
      rollup.proformaMetric === "charter_revenue"
        ? result.charterRevenue
        : rollup.proformaMetric === "fuel_surcharge"
          ? result.fuelSurchargeRevenue
          : rollup.proformaMetric === "charter_revenue_total"
            ? result.charterRevenue + result.fuelSurchargeRevenue
            : rollup.proformaMetric === "total_revenue"
              ? result.totalRevenue
              : rollup.proformaMetric === "charter_variable"
                ? result.charterVariableCost
                : rollup.proformaMetric === "owner_variable"
                  ? result.ownerVariableCost
                  : rollup.proformaMetric === "net_annual"
                    ? result.netAnnualCost
                    : 0;
    const isCost =
      rollup.proformaMetric === "charter_variable" ||
      rollup.proformaMetric === "owner_variable";
    return {
      label: rollup.label,
      formatted: formatCurrency(isCost ? Math.abs(value) : value),
      proFormaHint: rollup.proFormaHint,
    };
  }

  if (rollup.type === "calculated" && rollup.valueKey) {
    const amount = calculatedAssumptionAmount(effective, rollup.valueKey);
    if (amount == null || !Number.isFinite(amount)) return null;
    return {
      label: rollup.label,
      formatted: formatRollupValue(String(amount), rollup.format),
      proFormaHint: rollup.proFormaHint,
    };
  }

  if (rollup.type === "sum" && rollup.sumKeys?.length) {
    const total = rollup.sumKeys.reduce((s, k) => s + num(effective[k]), 0);
    return {
      label: rollup.label,
      formatted: formatRollupValue(String(total), rollup.format ?? "currency"),
      proFormaHint: rollup.proFormaHint,
    };
  }

  if (rollup.type === "hourly" && rollup.sumKeys?.length) {
    const total = rollup.sumKeys.reduce((s, k) => s + num(effective[k]), 0);
    if (total <= 0) return null;
    return {
      label: rollup.label,
      formatted: `${formatCurrency(total)}/hr`,
      proFormaHint: rollup.proFormaHint ?? "Hourly rates · multiplied by hours on Pro Forma",
    };
  }

  if (rollup.type === "value" && rollup.valueKey) {
    const raw = effective[rollup.valueKey];
    const n = num(raw);
    if (!raw?.trim() && n <= 0) return null;
    return {
      label: rollup.label,
      formatted: formatRollupValue(raw?.trim() ? String(n) : "0", rollup.format ?? "number"),
      proFormaHint: rollup.proFormaHint,
    };
  }

  return null;
}

function formatRollupValue(
  raw: string,
  format: SectionProFormaRollup["format"] = "number"
): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || raw === "") return "—";
  switch (format) {
    case "currency":
      return formatCurrency(n);
    case "ratio":
      return n.toFixed(2);
    case "hours":
      return `${n % 1 === 0 ? n : n.toFixed(1)} hrs`;
    case "percent":
      return `${n}%`;
    default:
      return n % 1 === 0 ? String(n) : n.toFixed(2);
  }
}
