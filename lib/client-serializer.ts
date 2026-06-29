import type { ProposalSnapshotPayload } from "./snapshot";
import type { ProposalOwnerProfile } from "./proposal-owners";
import { findAircraftEntry } from "./portal-aircraft-types";
import { resolvePortalCalculationMap } from "./portal-calculation-assumptions";
import { loadOwnerProfilesForAircraft } from "./proposal-owners-db";
import { normalizeCustomFixedCostsInStringMap } from "./proforma-custom-fixed-costs";
import { stringsToAssumptionMap } from "./workspace-proforma-client";
import { perfTimed } from "@/lib/perf-log";
import {
  buildClientSnapshotViewForEntry,
  serializeClientSnapshotFromPayload,
  type ClientSnapshotOverrides,
  type ClientSnapshotView,
} from "./client-serializer-payload";

export type { ClientSnapshotView, ClientSnapshotOverrides } from "./client-serializer-payload";
export {
  serializeClientSnapshotFromPayload,
  snapshotEntrySupportsClientBuild,
} from "./client-serializer-payload";

export type ClientSnapshotServerOverrides = ClientSnapshotOverrides & {
  proposalId?: string;
  prospectOpportunityType?: string;
  /** Draft preview only — recalculate from live workspace + warehouse. Published portals stay frozen. */
  useLiveWorkspace?: boolean;
};

/** Strip internal-only data from snapshot for client API responses. */
export async function serializeClientSnapshot(
  snapshot: ProposalSnapshotPayload,
  overrides?: ClientSnapshotServerOverrides
) {
  return perfTimed("serializeClientSnapshot", async () => {
    const targetAircraftId =
      overrides?.aircraftInstanceId ?? snapshot.primaryAircraftInstanceId ?? null;
    const entry = findAircraftEntry(snapshot, targetAircraftId);
    const useLiveWorkspace = overrides?.useLiveWorkspace === true;

    if (!useLiveWorkspace) {
      const sync = serializeClientSnapshotFromPayload(snapshot, overrides);
      if (sync) return sync;
    }

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

    return buildClientSnapshotViewForEntry(snapshot, entry, {
      ownerProfiles,
      frozenAssumptions,
      calculationMap,
      useLiveWorkspace,
      overrides,
    });
  });
}
