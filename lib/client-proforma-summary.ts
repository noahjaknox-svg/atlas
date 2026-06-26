import type { AircraftSnapshotEntry } from "./portal-aircraft-types";
import {
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
  stringsToAssumptionMap,
  type ClientCrewSummary,
} from "./workspace-proforma-client";
import type { ProFormaResult } from "./proforma";
import type { ProFormaStatementRow, ProFormaAssumptionUsedItem } from "./proforma-statement";
import type { ProposalOwnerProfile } from "./proposal-owners";
import { proformaHoursForProfiles } from "./proposal-owners";
import { toNumber } from "./utils";

export type { ClientCrewSummary };

export type ClientProFormaLineItem = {
  key: string;
  label: string;
  category: string;
  annual: number;
  monthly: number;
};

export type ClientProFormaSummary = {
  aircraftId: string;
  aircraftLabel: string;
  metrics: {
    netAnnualCost: number;
    netMonthlyCost: number;
    ownerHours: number;
    charterRevenueOffset: number;
    costPerOwnerHour: number;
    aircraftValue: number;
  };
  proForma: {
    lineItems: ClientProFormaLineItem[];
    netAnnualCost: number;
    netMonthlyCost: number;
    costPerOwnerHour: number;
    totalRevenue: number;
  };
  fixedCostBreakdown: Array<{ label: string; annual: number; monthly: number }>;
  summaryRows: Array<{ key: string; label: string; annual: number }>;
  statementRows: ProFormaStatementRow[];
  assumptionsUsed: ProFormaAssumptionUsedItem[];
};

function visibleAssumptionMap(entry: AircraftSnapshotEntry): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, meta] of Object.entries(entry.assumptions)) {
    if (meta.visibleToClient) map[key] = meta.value;
  }
  return map;
}

function resolveCalculationMap(
  entry: AircraftSnapshotEntry,
  calculationMap?: Record<string, string>
): Record<string, string> {
  if (calculationMap && Object.keys(calculationMap).length > 0) {
    return calculationMap;
  }
  const fromAssumptions = Object.fromEntries(
    Object.entries(entry.assumptions).map(([k, v]) => [k, v.value])
  );
  const calc = entry.calculationAssumptions ?? {};
  if (Object.keys(calc).length > 0) {
    return { ...fromAssumptions, ...calc };
  }
  if (Object.keys(fromAssumptions).length > 0) return fromAssumptions;
  return visibleAssumptionMap(entry);
}

function toClientLineItems(proForma: ProFormaResult): ClientProFormaLineItem[] {
  return proForma.lineItems
    .filter((l) =>
      ["revenue", "fixed", "variable", "subtotal", "total", "metric"].includes(l.category)
    )
    .map((l) => ({
      key: l.key,
      label: l.label,
      category: l.category,
      annual: l.annual,
      monthly: l.monthly,
    }));
}

/** Build read-only client pro forma summary aligned with internal workspace. */
export function buildClientProFormaSummary(
  entry: AircraftSnapshotEntry,
  overrides?: {
    aircraftValue?: number;
    ownerHours?: number;
    proformaOwnerHours?: number[];
    ownerProfiles?: ProposalOwnerProfile[];
    calculationMap?: Record<string, string>;
    crewStepIndex?: number;
  }
): ClientProFormaSummary {
  const baseMap = stringsToAssumptionMap(resolveCalculationMap(entry, overrides?.calculationMap));
  const profiles = overrides?.ownerProfiles ?? [];
  const calc = computeWorkspaceProFormaForClient(baseMap, {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours: overrides?.proformaOwnerHours,
    ownerProfiles: profiles.length > 0 ? profiles : undefined,
    crewStepIndex: overrides?.crewStepIndex,
  });

  const lineItems = toClientLineItems(calc.proForma);

  return {
    aircraftId: entry.id,
    aircraftLabel: entry.label,
    metrics: calc.metrics,
    proForma: {
      lineItems,
      netAnnualCost: calc.proForma.netAnnualCost,
      netMonthlyCost: calc.proForma.netMonthlyCost,
      costPerOwnerHour: calc.proForma.costPerOwnerHour,
      totalRevenue: calc.proForma.totalRevenue,
    },
    fixedCostBreakdown: calc.fixedCostBreakdown,
    summaryRows: calc.summaryRows,
    statementRows: calc.statementRows,
    assumptionsUsed: calc.assumptionsUsed,
  };
}

/** @deprecated Use breakdown from buildClientProFormaSummary */
export function buildFixedBreakdown(assumptions: Record<string, number | string>) {
  const entry = {
    id: "",
    label: "",
    aircraftProfileMode: "general" as const,
    aircraftTypeLabel: null,
    portalSubtitle: null,
    manufacturer: null,
    model: null,
    tailNumber: null,
    year: null,
    category: null,
    proposedHomeBase: null,
    clientSummary: null,
    portalImageUrl: null,
    portalVideoUrl: null,
    portalSpecHighlights: [],
    assumptions: Object.fromEntries(
      Object.entries(assumptions).map(([k, v]) => [
        k,
        {
          value: String(v),
          unit: null,
          visibleToClient: true,
          editableByClient: false,
          clientExplanation: null,
          category: "",
        },
      ])
    ),
    calculationAssumptions: Object.fromEntries(
      Object.entries(assumptions).map(([k, v]) => [k, String(v)])
    ),
    metrics: {
      netAnnualCost: 0,
      netMonthlyCost: 0,
      ownerHours: toNumber(assumptions.owner_annual_hours),
      charterRevenueOffset: 0,
      costPerOwnerHour: 0,
      aircraftValue: toNumber(assumptions.aircraft_value),
    },
    proForma: {
      blendedFuelPrice: 0,
      fuelCostPerHour: 0,
      variableCostPerHour: 0,
      charterRevenue: 0,
      fuelSurchargeRevenue: 0,
      totalRevenue: 0,
      charterVariableCost: 0,
      ownerVariableCost: 0,
      netBeforeOwner: 0,
      netAnnualCost: 0,
      netMonthlyCost: 0,
      costPerOwnerHour: 0,
      insuranceEstimate: 0,
      lineItems: [],
    },
  } satisfies AircraftSnapshotEntry;

  return buildClientProFormaSummary(entry).fixedCostBreakdown;
}

/** Derive per-owner pro forma hours from assumptions + profiles. */
export function deriveProformaOwnerHours(
  profiles: ProposalOwnerProfile[],
  assumptions: Record<string, string>
): number[] {
  return proformaHoursForProfiles(profiles, assumptions);
}

/** Crew + utilization summary for client portal display. */
export function buildClientCrewSummary(
  assumptions: Record<string, string>,
  ownerProfiles?: ProposalOwnerProfile[]
): ClientCrewSummary {
  return resolveClientCrewSummary(stringsToAssumptionMap(assumptions), {
    ownerProfiles,
  });
}
