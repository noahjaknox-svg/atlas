import type { AircraftInstance, WarehouseAircraft, ProposalAssumption, ProposalScenario } from "@prisma/client";
import {
  getAircraftDisplayName,
  getAircraftCardSubtitle,
  assumptionsFromInstance,
  applyProspectOpportunityFallback,
} from "./aircraft-workspace";
import { mergeAssumptionRowsForInstance } from "./proposal-assumption-load";
import { getAircraftTypeLabel, normalizeAircraftProfileMode } from "./aircraft-profile-mode";
import type { ProFormaResult } from "./proforma";
import {
  assumptionMapToStrings,
  computeWorkspaceProFormaForClient,
} from "./workspace-proforma-client";
import type { AircraftSnapshotEntry, AircraftSnapshotMetrics } from "./portal-aircraft-types";
import { parseSpecHighlights } from "./portal-aircraft-types";
import type { ProposalSnapshotPayload } from "./snapshot";
import { resolveEffectiveAssumptionsForInstance } from "./resolve-aircraft-defaults";
import { applyScenarioCrewToAssumptions } from "./scenario-crew";
import { assumptionsWithFinancingDefault } from "./financing-scenario";
import { loadOwnerProfilesForAircraft } from "./proposal-owners-db";
import {
  ownerHoursForUtilization,
  parseProformaOwnerHoursJson,
  totalOwnerFlightHours,
  type ProposalOwnerProfile,
} from "./proposal-owners";

type AircraftWithMaster = AircraftInstance & { warehouseAircraft: WarehouseAircraft | null };

const EMPTY_PROFORMA: ProFormaResult = {
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
};

const EMPTY_METRICS: AircraftSnapshotMetrics = {
  netAnnualCost: 0,
  netMonthlyCost: 0,
  ownerHours: 0,
  charterRevenueOffset: 0,
  costPerOwnerHour: 0,
  aircraftValue: 0,
};

function resolveOwnerHoursForSnapshot(
  fullMap: Record<string, string>,
  scenario: ProposalScenario | null | undefined,
  profiles: ProposalOwnerProfile[]
): number {
  if (profiles.length > 0) {
    const fromProforma = ownerHoursForUtilization(profiles, fullMap);
    const fromProfiles = totalOwnerFlightHours(profiles);
    const hasStoredProforma =
      parseProformaOwnerHoursJson(fullMap, profiles.length) != null;
    if (!hasStoredProforma && fromProfiles !== fromProforma) {
      return fromProfiles;
    }
    return fromProforma;
  }

  const fromAssumptions = parseFloat(fullMap.owner_annual_hours ?? "");
  if (Number.isFinite(fromAssumptions) && fromAssumptions >= 0) {
    return fromAssumptions;
  }
  if (scenario?.ownerHours != null) {
    const fromScenario = parseFloat(scenario.ownerHours.toString());
    if (Number.isFinite(fromScenario) && fromScenario >= 0) {
      return fromScenario;
    }
  }
  return 400;
}

function clientVisibleAssumptions(
  all: ProposalAssumption[],
  map: Record<string, string>
): ProposalSnapshotPayload["assumptions"] {
  const clientAssumptions: ProposalSnapshotPayload["assumptions"] = {};
  for (const a of all) {
    if (!a.visibleToClient) continue;
    const value = map[a.assumptionName];
    if (value === undefined) continue;
    clientAssumptions[a.assumptionName] = {
      value,
      unit: a.unit,
      visibleToClient: a.visibleToClient,
      editableByClient: a.editableByClient,
      clientExplanation: a.clientExplanation,
      category: a.category,
    };
  }
  return clientAssumptions;
}

export async function buildAircraftSnapshotEntry(args: {
  proposalId?: string;
  aircraft: AircraftWithMaster;
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>;
  allAssumptions: ProposalAssumption[];
  prospectOpportunityType: string;
  isPrimaryLegacy: boolean;
  scenario?: ProposalScenario | null;
}): Promise<AircraftSnapshotEntry> {
  const { aircraft, assumptionRows, allAssumptions, prospectOpportunityType, isPrimaryLegacy } =
    args;
  let map = mergeAssumptionRowsForInstance(assumptionRows, aircraft.id);
  if (isPrimaryLegacy && Object.keys(map).length === 0) {
    map = mergeAssumptionRowsForInstance(assumptionRows, null);
  }
  map = applyProspectOpportunityFallback(map, prospectOpportunityType);

  const meta = {
    id: aircraft.id,
    year: aircraft.year,
    tailNumber: aircraft.tailNumber,
    serialNumber: aircraft.serialNumber,
    proposedHomeBaseIcao: aircraft.proposedHomeBaseIcao,
    estimatedValue: aircraft.estimatedValue?.toString() ?? null,
    valueSource: aircraft.valueSource,
    aircraftMaster: aircraft.warehouseAircraft
      ? {
          manufacturer: aircraft.warehouseAircraft.manufacturer,
          model: aircraft.warehouseAircraft.model,
        }
      : null,
  };

  let fullMap = { ...assumptionsFromInstance(meta), ...map };
  fullMap = await resolveEffectiveAssumptionsForInstance(aircraft.id, fullMap);

  let profiles: Awaited<ReturnType<typeof loadOwnerProfilesForAircraft>>["profiles"] = [];
  if (args.proposalId) {
    const loaded = await loadOwnerProfilesForAircraft(
      args.proposalId,
      aircraft.id,
      fullMap
    );
    profiles = loaded.profiles;
  }

  if (args.scenario) {
    const ownerHours = resolveOwnerHoursForSnapshot(fullMap, args.scenario, profiles);
    fullMap = applyScenarioCrewToAssumptions(fullMap, {
      ownerFlightHours: ownerHours,
      crewStepIndex: args.scenario.crewStepIndex,
      leadPilotEnabled: args.scenario.leadPilotEnabled,
    });
  }

  fullMap = assumptionsWithFinancingDefault(fullMap);

  const workspaceProForma = computeWorkspaceProFormaForClient(fullMap);
  const proForma = workspaceProForma.proForma;
  const master = aircraft.warehouseAircraft;
  const profileMode = normalizeAircraftProfileMode(fullMap);
  const typeLabel =
    getAircraftTypeLabel(fullMap) ??
    (master ? [master.manufacturer, master.model].filter(Boolean).join(" ") || null : null);

  return {
    id: aircraft.id,
    label: getAircraftDisplayName(fullMap, meta),
    aircraftProfileMode: profileMode,
    aircraftTypeLabel: typeLabel,
    portalSubtitle: getAircraftCardSubtitle(fullMap, meta),
    manufacturer: master?.manufacturer ?? fullMap.aircraft_manufacturer ?? null,
    model: master?.model ?? fullMap.aircraft_model ?? null,
    tailNumber: aircraft.tailNumber,
    year: aircraft.year,
    category: master?.aircraftCategory ?? fullMap.aircraft_category ?? null,
    proposedHomeBase: aircraft.proposedHomeBaseIcao,
    clientSummary: aircraft.clientSummary,
    portalImageUrl:
      (aircraft as AircraftWithMaster & { portalImageUrl?: string | null }).portalImageUrl ?? null,
    portalVideoUrl:
      (aircraft as AircraftWithMaster & { portalVideoUrl?: string | null }).portalVideoUrl ?? null,
    portalSpecHighlights: parseSpecHighlights(
      (aircraft as AircraftWithMaster & { portalSpecHighlights?: unknown }).portalSpecHighlights
    ),
    assumptions: clientVisibleAssumptions(allAssumptions, fullMap),
    /** Merge raw + workspace-aligned map so line visibility and derived fields both reach portal recalc. */
    calculationAssumptions: assumptionMapToStrings({
      ...fullMap,
      ...workspaceProForma.calculationAssumptions,
    }),
    ownerProfiles: profiles.length > 0 ? profiles : undefined,
    metrics: workspaceProForma.metrics,
    proForma,
  };
}

/** List metadata only — skips warehouse resolve and pro forma math (draft preview). */
export function buildLightweightAircraftSnapshotEntry(args: {
  aircraft: AircraftWithMaster;
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>;
  allAssumptions: ProposalAssumption[];
  prospectOpportunityType: string;
  isPrimaryLegacy: boolean;
}): AircraftSnapshotEntry {
  const { aircraft, assumptionRows, allAssumptions, prospectOpportunityType, isPrimaryLegacy } =
    args;
  let map = mergeAssumptionRowsForInstance(assumptionRows, aircraft.id);
  if (isPrimaryLegacy && Object.keys(map).length === 0) {
    map = mergeAssumptionRowsForInstance(assumptionRows, null);
  }
  map = applyProspectOpportunityFallback(map, prospectOpportunityType);

  const meta = {
    id: aircraft.id,
    year: aircraft.year,
    tailNumber: aircraft.tailNumber,
    serialNumber: aircraft.serialNumber,
    proposedHomeBaseIcao: aircraft.proposedHomeBaseIcao,
    estimatedValue: aircraft.estimatedValue?.toString() ?? null,
    valueSource: aircraft.valueSource,
    aircraftMaster: aircraft.warehouseAircraft
      ? {
          manufacturer: aircraft.warehouseAircraft.manufacturer,
          model: aircraft.warehouseAircraft.model,
        }
      : null,
  };

  const fullMap = { ...assumptionsFromInstance(meta), ...map };
  const master = aircraft.warehouseAircraft;
  const profileMode = normalizeAircraftProfileMode(fullMap);
  const typeLabel =
    getAircraftTypeLabel(fullMap) ??
    (master ? [master.manufacturer, master.model].filter(Boolean).join(" ") || null : null);

  return {
    id: aircraft.id,
    label: getAircraftDisplayName(fullMap, meta),
    aircraftProfileMode: profileMode,
    aircraftTypeLabel: typeLabel,
    portalSubtitle: getAircraftCardSubtitle(fullMap, meta),
    manufacturer: master?.manufacturer ?? fullMap.aircraft_manufacturer ?? null,
    model: master?.model ?? fullMap.aircraft_model ?? null,
    tailNumber: aircraft.tailNumber,
    year: aircraft.year,
    category: master?.aircraftCategory ?? fullMap.aircraft_category ?? null,
    proposedHomeBase: aircraft.proposedHomeBaseIcao,
    clientSummary: aircraft.clientSummary,
    portalImageUrl:
      (aircraft as AircraftWithMaster & { portalImageUrl?: string | null }).portalImageUrl ?? null,
    portalVideoUrl:
      (aircraft as AircraftWithMaster & { portalVideoUrl?: string | null }).portalVideoUrl ?? null,
    portalSpecHighlights: parseSpecHighlights(
      (aircraft as AircraftWithMaster & { portalSpecHighlights?: unknown }).portalSpecHighlights
    ),
    assumptions: clientVisibleAssumptions(allAssumptions, fullMap),
    metrics: EMPTY_METRICS,
    proForma: EMPTY_PROFORMA,
  };
}

export async function buildAircraftSnapshotList(args: {
  proposalId?: string;
  includedAircraft: AircraftWithMaster[];
  primaryAircraftInstanceId: string | null;
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>;
  allAssumptions: ProposalAssumption[];
  prospectOpportunityType: string;
  baseScenariosByAircraft?: Record<string, ProposalScenario | null>;
  /** Omit = full resolve for all aircraft. Empty = lightweight list only. */
  fullyResolveAircraftIds?: string[];
}): Promise<AircraftSnapshotEntry[]> {
  const {
    proposalId,
    includedAircraft,
    primaryAircraftInstanceId,
    assumptionRows,
    allAssumptions,
    prospectOpportunityType,
    baseScenariosByAircraft = {},
    fullyResolveAircraftIds,
  } = args;

  const resolveAll = fullyResolveAircraftIds === undefined;
  const resolveSet = resolveAll ? null : new Set(fullyResolveAircraftIds);

  return Promise.all(
    includedAircraft.map((aircraft) => {
      if (resolveSet && !resolveSet.has(aircraft.id)) {
        return buildLightweightAircraftSnapshotEntry({
          aircraft,
          assumptionRows,
          allAssumptions,
          prospectOpportunityType,
          isPrimaryLegacy: aircraft.id === primaryAircraftInstanceId,
        });
      }
      return buildAircraftSnapshotEntry({
        proposalId,
        aircraft,
        assumptionRows,
        allAssumptions,
        prospectOpportunityType,
        isPrimaryLegacy: aircraft.id === primaryAircraftInstanceId,
        scenario: baseScenariosByAircraft[aircraft.id] ?? null,
      });
    })
  );
}
