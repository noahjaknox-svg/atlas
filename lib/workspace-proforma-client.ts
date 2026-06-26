import type { AssumptionMap } from "@/lib/assumptions";
import type { ProFormaResult } from "@/lib/proforma";
import { buildProFormaStatement, type ProFormaStatementRow, type ProFormaAssumptionUsedItem } from "@/lib/proforma-statement";
import type { AircraftSnapshotMetrics } from "@/lib/portal-aircraft-types";
import {
  applyProFormaVisibility,
  parseProFormaVisibility,
} from "@/lib/proforma-line-visibility";
import { isCharterProFormaRow, isCharterUsageEnabled } from "@/lib/usage-type";
import {
  formatCrewComposition,
  patchAssumptionsWithCrewStep,
  resolveCrewStepFromAssumptions,
  crewStepFloor,
} from "@/lib/crew-step";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";
import {
  OWNER_PROFORMA_HOURS_KEY,
  ownerHoursForUtilization,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";

const CLIENT_HIDDEN_METRIC_KEYS = new Set(["cost_per_owner_hour"]);

export type WorkspaceProFormaClientResult = {
  metrics: AircraftSnapshotMetrics;
  proForma: ProFormaResult;
  fixedCostBreakdown: Array<{ label: string; annual: number; monthly: number }>;
  summaryRows: Array<{ key: string; label: string; annual: number }>;
  statementRows: ProFormaStatementRow[];
  assumptionsUsed: ProFormaAssumptionUsedItem[];
  calculationAssumptions: AssumptionMap;
};

export type ClientProFormaOverrides = {
  aircraftValue?: number;
  /** Aggregate owner hours (single-owner or legacy callers). */
  ownerHours?: number;
  /** Per-owner pro forma hours aligned to ownerProfiles. */
  proformaOwnerHours?: number[];
  ownerProfiles?: ProposalOwnerProfile[];
  warehouseDefaults?: Record<string, string>;
  /** User-selected crew ladder step (portal scenario). */
  crewStepIndex?: number;
};

export type ClientCrewSummary = {
  composition: string;
  totalPilots: number;
  maxAnnualUtilization: number;
  ownerHours: number;
  charterFlightHours: number;
  requiredByOwnerHours: boolean;
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

function patchProformaOwnerHoursAll(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  hours: number[]
): AssumptionMap {
  const next = hours.map((h, i) =>
    Math.max(0, Number.isFinite(h) ? h : profiles[i]?.annualFlightHours ?? 0)
  );
  const total = next.reduce((s, h) => s + h, 0);
  return {
    ...assumptions,
    [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify(next),
    owner_annual_hours: String(total),
  };
}

function resolveOwnerHoursForPatch(
  assumptions: AssumptionMap,
  overrides: ClientProFormaOverrides
): number | null {
  const profiles = overrides.ownerProfiles ?? [];
  if (overrides.proformaOwnerHours != null && profiles.length > 0) {
    return overrides.proformaOwnerHours.reduce(
      (s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0),
      0
    );
  }
  if (overrides.ownerHours != null) return overrides.ownerHours;
  return null;
}

/** Lowest crew ladder step the portal should start from (warehouse minimum + owner hours). */
export function resolvePortalCrewStepFloor(
  assumptions: AssumptionMap,
  ownerHours: number,
  warehouseDefaults: Record<string, string> = {}
): number {
  const resolved = resolveCrewStepFromAssumptions(
    assumptions,
    { ownerHours },
    warehouseDefaults
  );
  return crewStepFloor(resolved);
}

/** Apply client-editable overrides and sync crew step + utilization like workspace. */
export function applyClientProFormaOverrides(
  assumptions: AssumptionMap,
  overrides?: ClientProFormaOverrides
): AssumptionMap {
  if (!overrides) return { ...assumptions };

  let map: AssumptionMap = { ...assumptions };
  const warehouseDefaults = overrides.warehouseDefaults ?? {};
  const profiles = overrides.ownerProfiles ?? [];

  if (overrides.aircraftValue != null) {
    map.aircraft_value = String(overrides.aircraftValue);
  }

  if (overrides.proformaOwnerHours != null && profiles.length > 0) {
    map = patchProformaOwnerHoursAll(map, profiles, overrides.proformaOwnerHours);
  } else if (overrides.ownerHours != null) {
    if (profiles.length === 1) {
      map = patchProformaOwnerHoursAll(map, profiles, [overrides.ownerHours]);
    } else if (profiles.length === 0) {
      map.owner_annual_hours = String(overrides.ownerHours);
    }
  }

  const ownerHours = resolveOwnerHoursForPatch(map, overrides);

  if (ownerHours != null || overrides.crewStepIndex != null) {
    map = patchAssumptionsWithCrewStep(map, warehouseDefaults, {
      ...(ownerHours != null ? { ownerHours } : {}),
      ...(overrides.crewStepIndex != null ? { userStep: overrides.crewStepIndex } : {}),
    });
  }

  return map;
}

/** Read-only crew + utilization summary for client portal UI. */
export function resolveClientCrewSummary(
  assumptions: AssumptionMap,
  options?: {
    ownerProfiles?: ProposalOwnerProfile[];
    warehouseDefaults?: Record<string, string>;
  }
): ClientCrewSummary {
  const warehouseDefaults = options?.warehouseDefaults ?? {};
  const profiles = options?.ownerProfiles ?? [];
  const ownerHours =
    profiles.length > 0
      ? ownerHoursForUtilization(profiles, assumptions)
      : num(assumptions.owner_annual_hours);

  const resolved = resolveCrewStepFromAssumptions(
    assumptions,
    { ownerHours },
    warehouseDefaults
  );
  const effective = patchAssumptionsWithCrewStep(assumptions, warehouseDefaults, {
    ownerHours,
  });
  const profile = computeUtilizationProfile(effective);

  return {
    composition: formatCrewComposition(resolved),
    totalPilots: resolved.totalPilots,
    maxAnnualUtilization: resolved.maxAnnualUtilization,
    ownerHours,
    charterFlightHours: profile.availableCharterFlightHours,
    requiredByOwnerHours:
      resolved.requiredStep > resolved.minStep &&
      resolved.stepIndex === resolved.requiredStep,
  };
}

/** Align client/deck pro forma with internal workspace `buildProFormaStatement`. */
export function computeWorkspaceProFormaForClient(
  assumptions: AssumptionMap,
  overrides?: ClientProFormaOverrides
): WorkspaceProFormaClientResult {
  const map = applyClientProFormaOverrides(assumptions, overrides);

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
    assumptionsUsed: statement.assumptionsUsed,
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
