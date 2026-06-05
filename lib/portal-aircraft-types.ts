import type { ProFormaResult } from "./proforma";
import type { ProposalSnapshotPayload } from "./snapshot";

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
  /** Full assumption map used for workspace-aligned pro forma (not only client-visible). */
  calculationAssumptions?: Record<string, string>;
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

  const label =
    [payload.aircraft.manufacturer, payload.aircraft.model].filter(Boolean).join(" ") ||
    payload.aircraft.tailNumber ||
    "Your aircraft";

  return [
    {
      id: "legacy-primary",
      label,
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
  if (!aircraftInstanceId) return list[0]!;
  return list.find((a) => a.id === aircraftInstanceId) ?? list[0]!;
}
