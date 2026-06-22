import type { AircraftInstance, WarehouseAircraft, ProposalAssumption, ProposalScenario } from "@prisma/client";
import {
  aircraftAssumptionCategory,
  getAircraftDisplayName,
  mergeLegacyAssumptions,
  assumptionsFromInstance,
  applyProspectOpportunityFallback,
} from "./aircraft-workspace";
import type { ProFormaResult } from "./proforma";
import {
  assumptionMapToStrings,
  computeWorkspaceProFormaForClient,
} from "./workspace-proforma-client";
import type { AircraftSnapshotEntry, AircraftSnapshotMetrics } from "./portal-aircraft-types";
import { parseSpecHighlights } from "./portal-aircraft-types";
import type { ProposalSnapshotPayload } from "./snapshot";
import { resolveEffectiveAssumptionsForInstance } from "./resolve-aircraft-defaults";

type AircraftWithMaster = AircraftInstance & { warehouseAircraft: WarehouseAircraft | null };

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
  aircraft: AircraftWithMaster;
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>;
  allAssumptions: ProposalAssumption[];
  prospectOpportunityType: string;
  isPrimaryLegacy: boolean;
  scenario?: ProposalScenario | null;
}): Promise<AircraftSnapshotEntry> {
  const { aircraft, assumptionRows, allAssumptions, prospectOpportunityType, isPrimaryLegacy } =
    args;
  const category = aircraftAssumptionCategory(aircraft.id);
  let map = mergeLegacyAssumptions(assumptionRows, category);
  if (isPrimaryLegacy && Object.keys(map).length === 0) {
    map = mergeLegacyAssumptions(assumptionRows, "__legacy__");
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
  const workspaceProForma = computeWorkspaceProFormaForClient(fullMap);
  const proForma = workspaceProForma.proForma;
  const master = aircraft.warehouseAircraft;

  return {
    id: aircraft.id,
    label: getAircraftDisplayName(fullMap, meta),
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
    calculationAssumptions: assumptionMapToStrings(fullMap),
    metrics: workspaceProForma.metrics,
    proForma,
  };
}

export async function buildAircraftSnapshotList(args: {
  includedAircraft: AircraftWithMaster[];
  primaryAircraftInstanceId: string | null;
  assumptionRows: Array<{ category: string; assumptionName: string; value: string }>;
  allAssumptions: ProposalAssumption[];
  prospectOpportunityType: string;
}): Promise<AircraftSnapshotEntry[]> {
  const { includedAircraft, primaryAircraftInstanceId, assumptionRows, allAssumptions, prospectOpportunityType } =
    args;

  return Promise.all(
    includedAircraft.map((aircraft) =>
      buildAircraftSnapshotEntry({
        aircraft,
        assumptionRows,
        allAssumptions,
        prospectOpportunityType,
        isPrimaryLegacy: aircraft.id === primaryAircraftInstanceId,
      })
    )
  );
}
