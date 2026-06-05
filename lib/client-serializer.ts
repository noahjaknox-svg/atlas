import type { ProposalSnapshotPayload } from "./snapshot";
import { buildClientProFormaSummary } from "./client-proforma-summary";
import { findAircraftEntry, normalizeAircraftList } from "./portal-aircraft-types";
import { resolvePortalCalculationMap } from "./portal-calculation-assumptions";

/** Strip internal-only data from snapshot for client API responses. */
export async function serializeClientSnapshot(
  snapshot: ProposalSnapshotPayload,
  overrides?: {
    aircraftValue?: number;
    ownerHours?: number;
    aircraftInstanceId?: string | null;
    proposalId?: string;
    prospectOpportunityType?: string;
  }
) {
  const entry = findAircraftEntry(snapshot, overrides?.aircraftInstanceId);

  let calculationMap: Record<string, string> | undefined;
  if (overrides?.proposalId) {
    const resolvedInstanceId =
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

  const summary = buildClientProFormaSummary(entry, {
    aircraftValue: overrides?.aircraftValue,
    ownerHours: overrides?.ownerHours,
    calculationMap,
  });

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
    baseMetrics: summary.metrics,
    proForma: summary.proForma,
    fixedCostBreakdown: summary.fixedCostBreakdown,
    statementRows: summary.statementRows,
  };
}

export type ClientSnapshotView = Awaited<ReturnType<typeof serializeClientSnapshot>>;
