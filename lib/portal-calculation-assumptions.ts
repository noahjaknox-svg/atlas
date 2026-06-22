import type { AssumptionMap } from "./assumptions";
import { prisma } from "./db";
import {
  aircraftAssumptionCategory,
  applyProspectOpportunityFallback,
  assumptionsFromInstance,
  mergeLegacyAssumptions,
} from "./aircraft-workspace";
import type { AircraftSnapshotEntry } from "./portal-aircraft-types";
import { normalizeAircraftList } from "./portal-aircraft-types";
import type { ProposalSnapshotPayload } from "./snapshot";
import { buildEffectiveAssumptions } from "./resolve-effective-assumptions";
import { resolveEffectiveAssumptionsForInstance } from "./resolve-aircraft-defaults";
import { resolveAircraftDefaults } from "./resolve-aircraft-defaults";

const CLIENT_OVERRIDE_KEYS = new Set(["aircraft_value", "owner_annual_hours"]);

function snapshotEntryToInstanceMeta(entry: AircraftSnapshotEntry) {
  return {
    id: entry.id,
    year: entry.year,
    tailNumber: entry.tailNumber,
    serialNumber: null as string | null,
    proposedHomeBaseIcao: entry.proposedHomeBase,
    estimatedValue: entry.metrics.aircraftValue
      ? String(entry.metrics.aircraftValue)
      : null,
    valueSource: null as string | null,
    aircraftMaster:
      entry.manufacturer || entry.model
        ? {
            manufacturer: entry.manufacturer ?? "",
            model: entry.model ?? "",
          }
        : null,
  };
}

function clientOverridesFromSnapshot(entry: AircraftSnapshotEntry): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const [key, meta] of Object.entries(entry.assumptions)) {
    if (CLIENT_OVERRIDE_KEYS.has(key) && meta.value?.trim()) {
      overrides[key] = meta.value;
    }
  }
  return overrides;
}

function mergeAssumptionRowsForEntry(
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>,
  entry: AircraftSnapshotEntry,
  aircraftInstanceId: string | null
): AssumptionMap {
  const categories = new Set<string>();

  if (entry.id !== "legacy-primary") {
    categories.add(aircraftAssumptionCategory(entry.id));
  }
  if (aircraftInstanceId) {
    categories.add(aircraftAssumptionCategory(aircraftInstanceId));
  }
  categories.add("__legacy__");

  let merged: AssumptionMap = {};
  for (const category of Array.from(categories)) {
    merged = { ...merged, ...mergeLegacyAssumptions(assumptionRows, category) };
  }
  return merged;
}

/** Load full workspace assumption map aligned with internal pro forma editor. */
export async function resolvePortalCalculationMap(
  proposalId: string,
  entry: AircraftSnapshotEntry,
  prospectOpportunityType?: string,
  aircraftInstanceId?: string | null
): Promise<Record<string, string>> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      aircraftInstanceId: true,
      prospect: { select: { opportunityType: true } },
    },
  });

  const resolvedInstanceId =
    aircraftInstanceId && aircraftInstanceId !== "legacy-primary"
      ? aircraftInstanceId
      : entry.id !== "legacy-primary"
        ? entry.id
        : proposal?.aircraftInstanceId ?? null;

  const assumptionRows = await prisma.proposalAssumption.findMany({
    where: { proposalId },
    select: { category: true, assumptionName: true, value: true },
  });

  let full: AssumptionMap = {
    ...assumptionsFromInstance(snapshotEntryToInstanceMeta(entry)),
    ...mergeAssumptionRowsForEntry(assumptionRows, entry, resolvedInstanceId),
    ...clientOverridesFromSnapshot(entry),
  };

  const opportunityType =
    prospectOpportunityType ??
    full.opportunity_type ??
    proposal?.prospect.opportunityType;

  if (opportunityType) {
    full = applyProspectOpportunityFallback(full, opportunityType);
  }

  if (resolvedInstanceId) {
    full = await resolveEffectiveAssumptionsForInstance(resolvedInstanceId, full);
  } else {
    full = buildEffectiveAssumptions(full, {});
  }

  return full;
}

export async function enrichSnapshotAircraftList(
  proposalId: string,
  payload: ProposalSnapshotPayload,
  prospectOpportunityType?: string
): Promise<ProposalSnapshotPayload> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { aircraftInstanceId: true },
  });

  const list = normalizeAircraftList(payload);
  const enrichedList = await Promise.all(
    list.map(async (entry) => {
      const calculationAssumptions = await resolvePortalCalculationMap(
        proposalId,
        entry,
        prospectOpportunityType,
        entry.id !== "legacy-primary" ? entry.id : proposal?.aircraftInstanceId
      );
      return { ...entry, calculationAssumptions };
    })
  );

  return { ...payload, aircraftList: enrichedList };
}
