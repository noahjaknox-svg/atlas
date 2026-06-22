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

  const summaryOverrides = {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
    calculationMap,
  };

  const summary = buildClientProFormaSummary(entry, summaryOverrides);

  const baselineSummary = buildClientProFormaSummary(entry, {
    calculationMap,
    proformaOwnerHours: baselineProformaHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
  });

  const effectiveMap = computeWorkspaceProFormaForClient(baseAssumptions, {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    proformaOwnerHours,
    ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
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
    /** Full assumption map for instant client-side pro forma recalculation. */
    calculationAssumptions: calculationMap ?? entry.calculationAssumptions ?? {},
  };
}

export type ClientSnapshotView = Awaited<ReturnType<typeof serializeClientSnapshot>>;
