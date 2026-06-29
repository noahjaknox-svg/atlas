import type { ProFormaResult } from "./proforma";
import type { ProposalOwnerProfile } from "./proposal-owners";
import type { ProposalSnapshotPayload } from "./snapshot";
import type { AircraftProfileMode } from "./aircraft-profile-mode";

export type AircraftSnapshotMetrics = {
  netAnnualCost: number;
  netMonthlyCost: number;
  ownerHours: number;
  charterRevenueOffset: number;
  costPerOwnerHour: number;
  aircraftValue: number;
};

export type AircraftSnapshotEntry = {
  id: string;
  label: string;
  aircraftProfileMode: AircraftProfileMode;
  aircraftTypeLabel: string | null;
  portalSubtitle: string | null;
  manufacturer: string | null;
  model: string | null;
  tailNumber: string | null;
  year: number | null;
  category: string | null;
  proposedHomeBase: string | null;
  clientSummary: string | null;
  portalImageUrl: string | null;
  portalVideoUrl: string | null;
  portalSpecHighlights: string[];
  assumptions: ProposalSnapshotPayload["assumptions"];
  /** Full assumption map used for workspace-aligned pro forma (not only prospect-visible). */
  calculationAssumptions?: Record<string, string>;
  /** Frozen owner profiles at publish time (published portal reads these, not live DB). */
  ownerProfiles?: ProposalOwnerProfile[];
  metrics: AircraftSnapshotMetrics;
  proForma: ProFormaResult;
};

export function parseSpecHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** Normalize aircraftList from snapshot; synthesize from legacy single-aircraft payload when missing. */
export function normalizeAircraftList(
  payload: ProposalSnapshotPayload
): AircraftSnapshotEntry[] {
  if (payload.aircraftList?.length) return payload.aircraftList;

  const legacyType =
    [payload.aircraft.manufacturer, payload.aircraft.model].filter(Boolean).join(" ") || null;
  const legacyMode: AircraftProfileMode = payload.aircraft.tailNumber ? "existing" : "general";
  const legacyLabel =
    legacyMode === "existing" && payload.aircraft.tailNumber
      ? payload.aircraft.tailNumber
      : legacyType || payload.aircraft.tailNumber || "Your aircraft";

  return [
    {
      id: "legacy-primary",
      label: legacyLabel,
      aircraftProfileMode: legacyMode,
      aircraftTypeLabel: legacyType,
      portalSubtitle: legacyMode === "existing" ? legacyType : payload.aircraft.proposedHomeBase,
      manufacturer: payload.aircraft.manufacturer,
      model: payload.aircraft.model,
      tailNumber: payload.aircraft.tailNumber,
      year: payload.aircraft.year,
      category: payload.aircraft.category,
      proposedHomeBase: payload.aircraft.proposedHomeBase,
      clientSummary: payload.aircraft.clientSummary,
      portalImageUrl: null,
      portalVideoUrl: null,
      portalSpecHighlights: [],
      assumptions: payload.assumptions,
      calculationAssumptions: Object.fromEntries(
        Object.entries(payload.assumptions).map(([k, v]) => [k, v.value])
      ),
      metrics: payload.metrics,
      proForma: payload.proForma,
    },
  ];
}

export function findAircraftEntry(
  payload: ProposalSnapshotPayload,
  aircraftInstanceId?: string | null
): AircraftSnapshotEntry {
  const list = normalizeAircraftList(payload);
  const resolvedId =
    aircraftInstanceId ??
    payload.primaryAircraftInstanceId ??
    null;
  if (!resolvedId) return list[0]!;
  const exact = list.find((a) => a.id === resolvedId);
  if (exact) return exact;
  const primary = payload.primaryAircraftInstanceId
    ? list.find((a) => a.id === payload.primaryAircraftInstanceId)
    : undefined;
  return primary ?? list[0]!;
}
