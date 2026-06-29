import type { AssumptionMap } from "./assumptions";
import { prisma } from "./db";
import {
  applyProspectOpportunityFallback,
  assumptionsFromInstance,
} from "./aircraft-workspace";
import type { AircraftSnapshotEntry } from "./portal-aircraft-types";
import { mergeAssumptionRowsForEntry } from "./portal-assumption-merge";
import {
  normalizeProformaCustomFixedCostsAssumption,
} from "./proforma-custom-fixed-costs";
import { buildEffectiveAssumptions } from "./resolve-effective-assumptions";
import { resolveEffectiveAssumptionsForInstance } from "./resolve-aircraft-defaults";
import { resolveAircraftDefaults } from "./resolve-aircraft-defaults";

const CLIENT_OVERRIDE_KEYS = new Set(["aircraft_value"]);

function snapshotEntryToInstanceMeta(entry: AircraftSnapshotEntry) {
  return {
    id: entry.id,
    year: entry.year,
    tailNumber: entry.tailNumber,
    serialNumber: null as string | null,
    proposedHomeBaseIcao: entry.proposedHomeBase,
    estimatedValue: null,
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

async function applyConfiguratorAircraftValue(
  full: AssumptionMap,
  resolvedInstanceId: string | null
): Promise<AssumptionMap> {
  if (!resolvedInstanceId) return full;

  const defaults = await resolveAircraftDefaults({
    aircraftInstanceId: resolvedInstanceId,
    assumptions: full,
  });
  const warehouse = defaults.aircraft_value?.trim();
  if (!warehouse) return full;

  const stored = full.aircraft_value?.trim();
  const storedNum = parseFloat(stored ?? "");
  if (!stored || !Number.isFinite(storedNum) || storedNum <= 0) {
    return { ...full, aircraft_value: warehouse };
  }
  return full;
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
    full = await applyConfiguratorAircraftValue(full, resolvedInstanceId);
  } else {
    full = buildEffectiveAssumptions(full, {});
  }

  full = normalizeProformaCustomFixedCostsAssumption(full);

  return full;
}

/** Draft-only: live workspace resolver — not used on published portal paths. */
