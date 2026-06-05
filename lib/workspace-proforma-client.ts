import type { AssumptionMap } from "@/lib/assumptions";
import type { ProFormaResult } from "@/lib/proforma";
import { buildProFormaStatement, type ProFormaStatementRow } from "@/lib/proforma-statement";
import type { AircraftSnapshotMetrics } from "@/lib/portal-aircraft-types";
import {
  applyProFormaVisibility,
  parseProFormaVisibility,
} from "@/lib/proforma-line-visibility";
import { isCharterProFormaRow, isCharterUsageEnabled } from "@/lib/usage-type";

const CLIENT_HIDDEN_METRIC_KEYS = new Set(["cost_per_owner_hour"]);

export type WorkspaceProFormaClientResult = {
  metrics: AircraftSnapshotMetrics;
  proForma: ProFormaResult;
  fixedCostBreakdown: Array<{ label: string; annual: number; monthly: number }>;
  summaryRows: Array<{ key: string; label: string; annual: number }>;
  statementRows: ProFormaStatementRow[];
  calculationAssumptions: AssumptionMap;
};

/** Rows shown on client portal — respects workspace visibility toggles and charter mode. */
export function filterClientStatementRows(
  rows: ProFormaStatementRow[],
  assumptions: AssumptionMap
): ProFormaStatementRow[] {
  const charterEnabled = isCharterUsageEnabled(assumptions);
  return rows
    .filter((r) => r.kind !== "info")
    .filter((r) => !CLIENT_HIDDEN_METRIC_KEYS.has(r.key))
    .filter((r) => charterEnabled || !isCharterProFormaRow(r))
    .filter((r) => r.kind === "section" || !r.hidden);
}

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

function findRow(rows: ProFormaStatementRow[], key: string) {
  return rows.find((r) => r.key === key);
}

/** Align client/deck pro forma with internal workspace `buildProFormaStatement`. */
export function computeWorkspaceProFormaForClient(
  assumptions: AssumptionMap,
  overrides?: { aircraftValue?: number; ownerHours?: number }
): WorkspaceProFormaClientResult {
  const map: AssumptionMap = { ...assumptions };
  if (overrides?.aircraftValue != null) {
    map.aircraft_value = String(overrides.aircraftValue);
  }
  if (overrides?.ownerHours != null) {
    map.owner_annual_hours = String(overrides.ownerHours);
  }

  const statement = buildProFormaStatement(map);
  const visibility = parseProFormaVisibility(map);
  const rows = applyProFormaVisibility(
    statement.rows,
    visibility,
    statement.utilization.ownerFlightHours,
    map
  );
  const statementRows = filterClientStatementRows(rows, map);

  const netAnnual = findRow(rows, "net_annual_owner")?.annual ?? 0;
  const netMonthly = findRow(rows, "net_monthly_owner")?.annual ?? netAnnual / 12;
  const costPerHour = findRow(rows, "cost_per_owner_hour")?.annual ?? 0;
  const totalRevenue = Math.max(0, findRow(rows, "total_revenue")?.annual ?? 0);
  const ownerVar = Math.abs(findRow(rows, "total_owner_variable")?.annual ?? 0);

  const fixedCostBreakdown = statementRows
    .filter((r) => r.layout === "fixed" && r.kind === "line" && r.annual != null)
    .map((r) => ({
      label: r.label,
      annual: Math.abs(r.annual!),
      monthly: Math.abs(r.annual!) / 12,
    }))
    .filter((i) => i.annual > 0);

  const fixedTotal = fixedCostBreakdown.reduce((s, i) => s + i.annual, 0);

  const summaryRows: WorkspaceProFormaClientResult["summaryRows"] = [
    { key: "fixed", label: "Fixed Ownership Costs", annual: fixedTotal },
    { key: "owner", label: "Owner Flight Costs", annual: ownerVar },
    { key: "charter_rev", label: "Charter Revenue Offset", annual: -totalRevenue },
  ];

  const ownerHours = statement.utilization.ownerHours;
  const aircraftValue = num(map.aircraft_value);

  const metrics: AircraftSnapshotMetrics = {
    netAnnualCost: netAnnual,
    netMonthlyCost: netMonthly,
    ownerHours,
    charterRevenueOffset: totalRevenue,
    costPerOwnerHour: costPerHour,
    aircraftValue,
  };

  const proForma: ProFormaResult = {
    blendedFuelPrice: 0,
    fuelCostPerHour: 0,
    variableCostPerHour: 0,
    charterRevenue: totalRevenue,
    fuelSurchargeRevenue: 0,
    totalRevenue,
    charterVariableCost: Math.abs(findRow(rows, "total_charter_variable")?.annual ?? 0),
    ownerVariableCost: ownerVar,
    netBeforeOwner: findRow(rows, "net_operating_pl")?.annual ?? 0,
    netAnnualCost: netAnnual,
    netMonthlyCost: netMonthly,
    costPerOwnerHour: costPerHour,
    insuranceEstimate: 0,
    lineItems: [
      {
        key: "owner_variable",
        label: "Owner Variable Costs",
        category: "variable",
        annual: ownerVar,
        monthly: ownerVar / 12,
      },
      {
        key: "total_revenue",
        label: "Total Revenue",
        category: "total",
        annual: totalRevenue,
        monthly: totalRevenue / 12,
      },
      {
        key: "total_fixed",
        label: "Total Fixed Costs",
        category: "fixed",
        annual: fixedTotal,
        monthly: fixedTotal / 12,
      },
    ],
  };

  return {
    metrics,
    proForma,
    fixedCostBreakdown,
    summaryRows,
    statementRows,
    calculationAssumptions: map,
  };
}

/** Flat assumptions map for publish + client recalculation (all workspace keys). */
export function assumptionMapToStrings(map: AssumptionMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => [k, String(v)])
  );
}

export function stringsToAssumptionMap(
  stored: Record<string, string> | undefined
): AssumptionMap {
  if (!stored) return {};
  return { ...stored };
}
