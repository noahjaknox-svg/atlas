import type { ProposalSnapshotPayload } from "./snapshot";
import {
  buildClientCrewSummary,
  buildClientProFormaSummary,
  deriveProformaOwnerHours,
} from "./client-proforma-summary";
import { findAircraftEntry, normalizeAircraftList } from "./portal-aircraft-types";
import { resolvePortalCalculationMap } from "./portal-calculation-assumptions";
import { loadOwnerProfilesForAircraft } from "./proposal-owners-db";
import {
  computeWorkspaceProFormaForClient,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "./workspace-proforma-client";

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
  }
) {
  const entry = findAircraftEntry(snapshot, overrides?.aircraftInstanceId);

  let calculationMap: Record<string, string> | undefined;
  let resolvedInstanceId: string | null = null;
  if (overrides?.proposalId) {
    resolvedInstanceId =
      overrides.aircraftInstanceId && overrides.aircraftInstanceId !== "legacy-primary"
        ? overrides.aircraftInstanceId
        : entry.id !== "legacy-primary"
          ? entry.id
          : null;

    calculationMap = await resolvePortalCalculationMap(
      overrides.proposalId,
      entry,
      overrides.prospectOpportunityType,
      resolvedInstanceId
    );
  }

  const baseAssumptions = stringsToAssumptionMap(
    calculationMap ?? entry.calculationAssumptions ?? {}
  );

  let ownerProfiles: Awaited<
    ReturnType<typeof loadOwnerProfilesForAircraft>
  >["profiles"] = [];
  if (overrides?.proposalId && resolvedInstanceId) {
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

  const summaryOverrides = {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
    calculationMap,
    crewStepIndex: activeCrewStepIndex,
  };

  const summary = buildClientProFormaSummary(entry, summaryOverrides);

  const baselineSummary = buildClientProFormaSummary(entry, {
    calculationMap,
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
    sections: snapshot.sections,
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
    calculationAssumptions: calculationMap ?? entry.calculationAssumptions ?? {},
  };
}

export type ClientSnapshotView = Awaited<ReturnType<typeof serializeClientSnapshot>>;
