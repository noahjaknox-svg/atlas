import type { ProposalSnapshotPayload } from "./snapshot";
import type { ProposalOwnerProfile } from "./proposal-owners";
import {
  buildClientCrewSummary,
  buildClientProFormaSummary,
  deriveProformaOwnerHours,
} from "./client-proforma-summary";
import { findAircraftEntry, normalizeAircraftList } from "./portal-aircraft-types";
import { resolvePortalCalculationMap } from "./portal-calculation-assumptions";
import { loadOwnerProfilesForAircraft } from "./proposal-owners-db";
import { normalizeCustomFixedCostsInStringMap } from "./proforma-custom-fixed-costs";
import {
  computeWorkspaceProFormaForClient,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "./workspace-proforma-client";
import { perfTimed } from "@/lib/perf-log";

/** Strip internal-only data from snapshot for client API responses. */
export async function serializeClientSnapshot(
  snapshot: ProposalSnapshotPayload,
  overrides?: {
    aircraftValue?: number;
    ownerHours?: number;
    proformaOwnerHours?: number[];
    aircraftInstanceId?: string | null;
    proposalId?: string;
    prospectOpportunityType?: string;
    crewStepIndex?: number;
    financingEnabled?: boolean;
    downPaymentPercent?: number;
    interestRate?: number;
    termMonths?: number;
    balloonPayment?: number;
    /** Draft preview only — recalculate from live workspace + warehouse. Published portals stay frozen. */
    useLiveWorkspace?: boolean;
  }
) {
  return perfTimed("serializeClientSnapshot", async () => {
  const targetAircraftId =
    overrides?.aircraftInstanceId ??
    snapshot.primaryAircraftInstanceId ??
    null;
  const entry = findAircraftEntry(snapshot, targetAircraftId);
  const useLiveWorkspace = overrides?.useLiveWorkspace === true;

  let calculationMap: Record<string, string> | undefined;
  let resolvedInstanceId: string | null = null;
  if (useLiveWorkspace && overrides?.proposalId) {
    resolvedInstanceId =
      targetAircraftId && targetAircraftId !== "legacy-primary"
        ? targetAircraftId
        : entry.id !== "legacy-primary"
          ? entry.id
          : null;

    calculationMap = normalizeCustomFixedCostsInStringMap(
      await resolvePortalCalculationMap(
        overrides.proposalId,
        entry,
        overrides.prospectOpportunityType,
        resolvedInstanceId
      )
    );
  }

  const frozenAssumptions = entry.calculationAssumptions ?? {};
  const baseAssumptions = stringsToAssumptionMap(
    useLiveWorkspace ? calculationMap ?? frozenAssumptions : frozenAssumptions
  );

  let ownerProfiles: ProposalOwnerProfile[] = entry.ownerProfiles ?? [];
  if (useLiveWorkspace && overrides?.proposalId && resolvedInstanceId) {
    const loaded = await loadOwnerProfilesForAircraft(
      overrides.proposalId,
      resolvedInstanceId,
      baseAssumptions
    );
    ownerProfiles = loaded.profiles;
  }

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
    /** Full assumption map for instant client-side pro forma recalculation. */
    calculationAssumptions:
      normalizeCustomFixedCostsInStringMap(
        useLiveWorkspace ? calculationMap ?? frozenAssumptions : frozenAssumptions
      ) ?? frozenAssumptions,
  };
  });
}

export type ClientSnapshotView = Awaited<ReturnType<typeof serializeClientSnapshot>>;
