import type { ProposalSnapshotPayload } from "./snapshot";
import type { ProposalOwnerProfile } from "./proposal-owners";
import type { ProFormaStatementRow } from "./proforma-statement";
import { normalizeAircraftList } from "./portal-aircraft-types";
import { snapshotEntrySupportsClientBuild } from "./client-serializer-payload";
import { normalizeCustomFixedCostsInStringMap } from "./proforma-custom-fixed-costs";
import { isFinancingScenarioVisible } from "./financing-scenario";
import {
  computeWorkspaceProFormaForClient,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "./workspace-proforma-client";

/** Portal compare view caps how many aircraft sit side by side. */
export const MAX_COMPARE_AIRCRAFT = 3;

/** One aircraft's frozen inputs, in the same shape the single-aircraft pro forma computes from. */
export type CompareAircraftInput = {
  id: string;
  label: string;
  tailNumber: string | null;
  portalImageUrl: string | null;
  calculationAssumptions: Record<string, string>;
  ownerProfiles: ProposalOwnerProfile[];
};

/** Inputs the client sets once and every compared aircraft shares. */
export type SharedCompareInputs = {
  proformaOwnerHours: number[];
  crewStepIndex: number;
  financingEnabled: boolean;
  downPaymentPercent?: number;
  interestRate?: number;
  termMonths?: number;
  balloonPayment?: number;
};

export type CompareMetrics = {
  netAnnualCost: number;
  netMonthlyCost: number;
  costPerOwnerHour: number;
  charterRevenueOffset: number;
  aircraftValue: number;
  ownerHours: number;
};

export type CompareColumn = {
  id: string;
  label: string;
  tailNumber: string | null;
  portalImageUrl: string | null;
  aircraftValue: number;
  /** Crew step actually used — the shared step raised to this aircraft's minimum. */
  crewStepIndex: number;
  crewStepRaised: boolean;
  metrics: CompareMetrics;
};

export type CompareAmount = { annual: number | null; monthly: number | null };

export type CompareStatementRow = {
  key: string;
  label: string;
  kind: ProFormaStatementRow["kind"];
  layout: ProFormaStatementRow["layout"];
  /** One entry per column, in column order; null when that aircraft has no such line. */
  values: Array<CompareAmount | null>;
  /** Column index with the most favorable amount, or null when there's nothing to rank. */
  best: { annual: number | null; monthly: number | null };
};

export type CompareMetricKey = "netAnnualCost" | "netMonthlyCost" | "costPerOwnerHour" | "charterRevenueOffset" | "aircraftValue";

export type CompareMetricRow = {
  key: CompareMetricKey;
  label: string;
  values: number[];
  /** Lowest cost wins, except charter offset where higher is better; aircraft value isn't ranked. */
  best: number | null;
};

export type ProFormaComparison = {
  columns: CompareColumn[];
  metricRows: CompareMetricRow[];
  statementRows: CompareStatementRow[];
};

function parseNumber(raw: string | undefined): number | null {
  const n = parseFloat(raw ?? "");
  return Number.isFinite(n) ? n : null;
}

/** Aircraft from a published snapshot that carry enough data to recompute in the browser. */
export function compareInputsFromPayload(payload: ProposalSnapshotPayload): CompareAircraftInput[] {
  return normalizeAircraftList(payload)
    .filter(snapshotEntrySupportsClientBuild)
    .map((entry) => {
      const frozen = entry.calculationAssumptions ?? {};
      return {
        id: entry.id,
        label: entry.label,
        tailNumber: entry.tailNumber,
        portalImageUrl: entry.portalImageUrl,
        calculationAssumptions: normalizeCustomFixedCostsInStringMap(frozen) ?? frozen,
        ownerProfiles: entry.ownerProfiles ?? [],
      };
    });
}

/** The aircraft value PrismJet proposed for this aircraft (what "Restore" returns to). */
export function defaultAircraftValue(input: CompareAircraftInput): number {
  return parseNumber(input.calculationAssumptions.aircraft_value) ?? 0;
}

function totalHours(hours: number[]): number {
  return hours.reduce((s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0), 0);
}

/** Index of the largest value (signed statement amounts: revenue +, expense −), ignoring nulls and ties. */
function bestIndexByMax(values: Array<number | null>): number | null {
  let best: number | null = null;
  let bestValue = -Infinity;
  let tie = false;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) return;
    if (v > bestValue) {
      bestValue = v;
      best = i;
      tie = false;
    } else if (v === bestValue) {
      tie = true;
    }
  });
  const ranked = values.filter((v) => v != null && Number.isFinite(v)).length;
  return ranked > 1 && !tie ? best : null;
}

function negate(values: number[]): number[] {
  return values.map((v) => -v);
}

/**
 * Side-by-side pro forma for several aircraft under one shared set of client inputs.
 *
 * Each column runs the exact computation the single-aircraft portal view runs
 * (`computeWorkspaceProFormaForClient` on the frozen map), so a compare column
 * always matches what the client sees when they open that aircraft alone.
 */
export function buildProFormaComparison(
  aircraft: CompareAircraftInput[],
  shared: SharedCompareInputs,
  aircraftValues: Record<string, number> = {}
): ProFormaComparison {
  const sharedTotalHours = totalHours(shared.proformaOwnerHours);

  const computed = aircraft.map((input) => {
    const assumptions = stringsToAssumptionMap(input.calculationAssumptions);
    const profiles = input.ownerProfiles;
    // Per-owner hours only line up when this aircraft has the same owner roster.
    const perOwner =
      profiles.length > 1 && profiles.length === shared.proformaOwnerHours.length;
    const floor = resolvePortalCrewStepFloor(assumptions, sharedTotalHours);
    const crewStepIndex = Math.max(shared.crewStepIndex, floor);
    const aircraftValue = aircraftValues[input.id] ?? defaultAircraftValue(input);

    const calc = computeWorkspaceProFormaForClient(assumptions, {
      aircraftValue,
      proformaOwnerHours: perOwner ? shared.proformaOwnerHours : undefined,
      ownerProfiles: perOwner ? profiles : undefined,
      ownerHours: perOwner ? undefined : sharedTotalHours,
      crewStepIndex,
      financingEnabled: isFinancingScenarioVisible(assumptions) ? shared.financingEnabled : false,
      downPaymentPercent: shared.downPaymentPercent,
      interestRate: shared.interestRate,
      termMonths: shared.termMonths,
      balloonPayment: shared.balloonPayment,
    });

    const netAnnualCost = calc.metrics.netAnnualCost;
    const column: CompareColumn = {
      id: input.id,
      label: input.label,
      tailNumber: input.tailNumber,
      portalImageUrl: input.portalImageUrl,
      aircraftValue,
      crewStepIndex,
      crewStepRaised: crewStepIndex > shared.crewStepIndex,
      metrics: {
        netAnnualCost,
        netMonthlyCost: calc.metrics.netMonthlyCost,
        // Same definition as the single-aircraft "Hourly cost" tile.
        costPerOwnerHour: sharedTotalHours > 0 ? Math.abs(netAnnualCost) / sharedTotalHours : 0,
        charterRevenueOffset: calc.metrics.charterRevenueOffset,
        aircraftValue,
        ownerHours: sharedTotalHours,
      },
    };
    return { column, rows: calc.statementRows };
  });

  const columns = computed.map((c) => c.column);

  // Metrics: net cost figures are magnitudes of the net annual cost, so lower wins.
  const netAnnual = columns.map((c) => Math.abs(c.metrics.netAnnualCost));
  const netMonthly = columns.map((c) => Math.abs(c.metrics.netMonthlyCost));
  const perHour = columns.map((c) => c.metrics.costPerOwnerHour);
  const charter = columns.map((c) => c.metrics.charterRevenueOffset);
  const metricRows: CompareMetricRow[] = [
    { key: "netAnnualCost", label: "Annual cost (net)", values: netAnnual, best: bestIndexByMax(negate(netAnnual)) },
    { key: "netMonthlyCost", label: "Monthly cost (net)", values: netMonthly, best: bestIndexByMax(negate(netMonthly)) },
    { key: "costPerOwnerHour", label: "Hourly cost", values: perHour, best: bestIndexByMax(negate(perHour)) },
    { key: "charterRevenueOffset", label: "Charter revenue offset", values: charter, best: bestIndexByMax(charter) },
    { key: "aircraftValue", label: "Aircraft value", values: columns.map((c) => c.aircraftValue), best: null },
  ];

  // Statement: union of row keys in first-seen order, so a line only one aircraft has
  // still gets a row (blank in the other columns) instead of shifting everything below.
  const order: string[] = [];
  const meta = new Map<string, ProFormaStatementRow>();
  for (const { rows } of computed) {
    for (const row of rows) {
      if (row.kind === "info") continue;
      if (!meta.has(row.key)) {
        meta.set(row.key, row);
        order.push(row.key);
      }
    }
  }
  const byColumn = computed.map(({ rows }) => new Map(rows.map((r) => [r.key, r])));

  const statementRows: CompareStatementRow[] = order.map((key) => {
    const row = meta.get(key)!;
    const values = byColumn.map((m) => {
      const r = m.get(key);
      return r ? { annual: r.annual, monthly: r.monthly } : null;
    });
    // Sections carry no amounts; metric rows (rates, hours) have no better/worse direction.
    const rankable = row.kind !== "section" && row.kind !== "metric";
    return {
      key,
      label: row.label,
      kind: row.kind,
      layout: row.layout,
      values,
      best: rankable
        ? {
            annual: bestIndexByMax(values.map((v) => v?.annual ?? null)),
            monthly: bestIndexByMax(values.map((v) => v?.monthly ?? null)),
          }
        : { annual: null, monthly: null },
    };
  });

  return { columns, metricRows, statementRows };
}

/** Parse `?compare=a,b,c` into known aircraft ids, deduped and capped. */
export function parseCompareParam(raw: string | null | undefined, knownIds: string[]): string[] {
  if (!raw) return [];
  const known = new Set(knownIds);
  const out: string[] = [];
  for (const id of raw.split(",").map((s) => s.trim())) {
    if (id && known.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_COMPARE_AIRCRAFT) break;
  }
  return out;
}
