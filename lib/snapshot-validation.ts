import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

const REQUIRED_CALCULATION_KEYS = [
  "aircraft_value",
  "owner_annual_hours",
  "pic_count",
  "sic_count",
] as const;

export function validateAircraftSnapshotEntry(entry: AircraftSnapshotEntry): string[] {
  const errors: string[] = [];
  const map = entry.calculationAssumptions ?? {};

  const aircraftValue = parseFloat(map.aircraft_value ?? "");
  if (!Number.isFinite(aircraftValue) || aircraftValue <= 0) {
    errors.push(`${entry.label}: calculationAssumptions.aircraft_value is missing or zero`);
  }

  const hasOwnerHours =
    (entry.ownerProfiles?.length ?? 0) > 0 ||
    (parseFloat(map.owner_annual_hours ?? "") >= 0 &&
      Number.isFinite(parseFloat(map.owner_annual_hours ?? "")));
  if (!hasOwnerHours) {
    errors.push(`${entry.label}: owner hours are missing (profiles or owner_annual_hours)`);
  }

  for (const key of REQUIRED_CALCULATION_KEYS) {
    if (key === "aircraft_value" || key === "owner_annual_hours") continue;
    const raw = map[key]?.trim();
    if (!raw) {
      errors.push(`${entry.label}: calculationAssumptions.${key} is missing`);
    }
  }

  return errors;
}

/** Publish-time guard — snapshot aircraft entries must be self-contained for the portal. */
export function validateSnapshotPayload(payload: ProposalSnapshotPayload): string[] {
  const list = normalizeAircraftList(payload);
  if (list.length === 0) {
    return ["Snapshot has no aircraft entries"];
  }

  return list.flatMap((entry) => validateAircraftSnapshotEntry(entry));
}
