import type { ProposalSnapshotPayload } from "./snapshot";
import type { ProposalOwnerProfile } from "./proposal-owners";
import {
  buildClientCrewSummary,
  buildClientProFormaSummary,
  deriveProformaOwnerHours,
} from "./client-proforma-summary";
import {
  findAircraftEntry,
  normalizeAircraftList,
  type AircraftSnapshotEntry,
} from "./portal-aircraft-types";
import { normalizeCustomFixedCostsInStringMap } from "./proforma-custom-fixed-costs";
import {
  computeWorkspaceProFormaForClient,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "./workspace-proforma-client";

export type ClientSnapshotOverrides = {
  aircraftValue?: number;
  ownerHours?: number;
  proformaOwnerHours?: number[];
  aircraftInstanceId?: string | null;
  crewStepIndex?: number;
  financingEnabled?: boolean;
  downPaymentPercent?: number;
  interestRate?: number;
  termMonths?: number;
  balloonPayment?: number;
};

/** Published snapshot entry has enough data for instant client-side pro forma. */
export function snapshotEntrySupportsClientBuild(entry: AircraftSnapshotEntry): boolean {
  return Object.keys(entry.calculationAssumptions ?? {}).length > 0;
}

function buildClientSnapshotView(
  snapshot: ProposalSnapshotPayload,
  entry: AircraftSnapshotEntry,
  options: {
    ownerProfiles: ProposalOwnerProfile[];
    frozenAssumptions: Record<string, string>;
    calculationMap?: Record<string, string>;
    useLiveWorkspace: boolean;
    overrides?: ClientSnapshotOverrides;
  }
) {
  const { ownerProfiles, frozenAssumptions, calculationMap, useLiveWorkspace, overrides } =
    options;

  const baseAssumptions = stringsToAssumptionMap(
    useLiveWorkspace ? calculationMap ?? frozenAssumptions : frozenAssumptions
  );

  const baselineProformaHours =
    ownerProfiles.length > 0
      ? deriveProformaOwnerHours(ownerProfiles, baseAssumptions)
      : [parseFloat(baseAssumptions.owner_annual_hours ?? "0") || 0];

  const proformaOwnerHours = overrides?.proformaOwnerHours ?? baselineProformaHours;

  const sumOwnerHours = (hours: number[]) =>
    hours.reduce((s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0), 0);

  const baselineOwnerHoursTotal = sumOwnerHours(baselineProformaHours);
  const activeOwnerHoursTotal =
    overrides?.ownerHours ?? sumOwnerHours(proformaOwnerHours);

  const baselineCrewStepIndex = resolvePortalCrewStepFloor(
    baseAssumptions,
    baselineOwnerHoursTotal
  );
  const activeCrewStepIndex =
    overrides?.crewStepIndex ??
    resolvePortalCrewStepFloor(baseAssumptions, activeOwnerHoursTotal);

  const hasClientOverrides =
    overrides?.aircraftValue != null ||
    overrides?.ownerHours != null ||
    overrides?.proformaOwnerHours != null ||
    overrides?.crewStepIndex != null ||
    overrides?.financingEnabled != null ||
    overrides?.downPaymentPercent != null ||
    overrides?.interestRate != null ||
    overrides?.termMonths != null ||
    overrides?.balloonPayment != null;

  const summaryOverrides = {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
    calculationMap: hasClientOverrides ? undefined : calculationMap,
    crewStepIndex: activeCrewStepIndex,
    financingEnabled: overrides?.financingEnabled,
    downPaymentPercent: overrides?.downPaymentPercent,
    interestRate: overrides?.interestRate,
    termMonths: overrides?.termMonths,
    balloonPayment: overrides?.balloonPayment,
  };

  const summary = buildClientProFormaSummary(entry, summaryOverrides);

  const baselineSummary = buildClientProFormaSummary(entry, {
    calculationMap: useLiveWorkspace ? calculationMap : undefined,
    proformaOwnerHours: baselineProformaHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
    crewStepIndex: baselineCrewStepIndex,
  });

  const effectiveMap = computeWorkspaceProFormaForClient(baseAssumptions, {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
    crewStepIndex: activeCrewStepIndex,
    financingEnabled: overrides?.financingEnabled,
    downPaymentPercent: overrides?.downPaymentPercent,
    interestRate: overrides?.interestRate,
    termMonths: overrides?.termMonths,
    balloonPayment: overrides?.balloonPayment,
  }).calculationAssumptions;

  const crewSummary = buildClientCrewSummary(
    Object.fromEntries(Object.entries(effectiveMap).map(([k, v]) => [k, String(v)])),
    ownerProfiles.length > 0 ? ownerProfiles : undefined
  );

  const aircraftList = normalizeAircraftList(snapshot).map((a) => ({
    id: a.id,
    label: a.label,
    tailNumber: a.tailNumber,
    year: a.year,
    portalImageUrl: a.portalImageUrl,
  }));

  return {
    proposal: snapshot.proposal,
    prospect: {
      name: snapshot.prospect.name,
      contactName: snapshot.prospect.contactName,
    },
    aircraft: {
      id: entry.id,
      label: entry.label,
      manufacturer: entry.manufacturer,
      model: entry.model,
      tailNumber: entry.tailNumber,
      year: entry.year,
      category: entry.category,
      proposedHomeBase: entry.proposedHomeBase,
      clientSummary: entry.clientSummary,
    },
    aircraftList,
    ownerProfiles,
    proformaOwnerHours,
    baseProformaOwnerHours: baselineProformaHours,
    defaultCrewStepIndex: baselineCrewStepIndex,
    crewSummary,
    editableFields: {
      aircraftValue: {
        value: summary.metrics.aircraftValue,
        label: "Aircraft Value",
        editable: true,
      },
      ownerAnnualHours: {
        value: summary.metrics.ownerHours,
        label: "Owner Annual Hours",
        editable: true,
      },
    },
    baseMetrics: baselineSummary.metrics,
    proForma: summary.proForma,
    fixedCostBreakdown: summary.fixedCostBreakdown,
    statementRows: summary.statementRows,
    assumptionsUsed: summary.assumptionsUsed,
    calculationAssumptions:
      normalizeCustomFixedCostsInStringMap(
        useLiveWorkspace ? calculationMap ?? frozenAssumptions : frozenAssumptions
      ) ?? frozenAssumptions,
  };
}

export type ClientSnapshotView = ReturnType<typeof buildClientSnapshotView>;

/**
 * Build client pro forma view from an in-memory published snapshot (no DB).
 * Returns null when the target aircraft lacks embedded calculationAssumptions.
 */
export function serializeClientSnapshotFromPayload(
  snapshot: ProposalSnapshotPayload,
  overrides?: ClientSnapshotOverrides
): ClientSnapshotView | null {
  const targetAircraftId =
    overrides?.aircraftInstanceId ?? snapshot.primaryAircraftInstanceId ?? null;
  const entry = findAircraftEntry(snapshot, targetAircraftId);
  if (!snapshotEntrySupportsClientBuild(entry)) {
    return null;
  }

  const frozenAssumptions = entry.calculationAssumptions ?? {};
  const ownerProfiles: ProposalOwnerProfile[] = entry.ownerProfiles ?? [];

  return buildClientSnapshotView(snapshot, entry, {
    ownerProfiles,
    frozenAssumptions,
    useLiveWorkspace: false,
    overrides,
  });
}

/** @internal Shared builder for server async path. */
export function buildClientSnapshotViewForEntry(
  snapshot: ProposalSnapshotPayload,
  entry: AircraftSnapshotEntry,
  options: {
    ownerProfiles: ProposalOwnerProfile[];
    frozenAssumptions: Record<string, string>;
    calculationMap?: Record<string, string>;
    useLiveWorkspace: boolean;
    overrides?: ClientSnapshotOverrides & {
      proposalId?: string;
      prospectOpportunityType?: string;
      useLiveWorkspace?: boolean;
    };
  }
): ClientSnapshotView {
  return buildClientSnapshotView(snapshot, entry, options);
}
