import type { AssumptionMap } from "@/lib/assumptions";
import type { WorkspaceField } from "@/lib/workspace-sections";

export type AircraftProfileMode = "existing" | "general";

export const AIRCRAFT_PROFILE_MODE_OPTIONS = [
  { value: "existing", label: "Use Existing Aircraft" },
  { value: "general", label: "Use General Aircraft" },
] as const;

export function normalizeAircraftProfileMode(assumptions: AssumptionMap): AircraftProfileMode {
  const raw = assumptions.aircraft_profile_mode?.trim();
  if (raw === "existing" || raw === "general") return raw;
  const tail = assumptions.tail_number?.trim();
  const year = assumptions.aircraft_year?.trim();
  const mfr = assumptions.aircraft_manufacturer?.trim();
  const mdl = assumptions.aircraft_model?.trim();
  if (tail || year) return "existing";
  if (mfr || mdl) return "general";
  return "general";
}

export function fieldVisibleForProfileMode(
  field: WorkspaceField,
  mode: AircraftProfileMode
): boolean {
  if (!field.profileMode) return true;
  return field.profileMode === mode;
}

export function requiredAssumptionKeysForProfileMode(mode: AircraftProfileMode): string[] {
  if (mode === "existing") {
    return ["aircraft_profile_mode", "tail_number", "aircraft_year"];
  }
  return ["aircraft_profile_mode", "aircraft_manufacturer", "aircraft_model"];
}

export function getAircraftTypeLabel(assumptions: AssumptionMap): string | null {
  const mfr = assumptions.aircraft_manufacturer?.trim();
  const mdl = assumptions.aircraft_model?.trim();
  if (mfr && mdl) return `${mfr} ${mdl}`;
  if (mdl) return mdl;
  if (mfr) return mfr;
  return null;
}

export function clearFieldsForProfileModeSwitch(
  mode: AircraftProfileMode
): Partial<AssumptionMap> {
  if (mode === "existing") {
    return {
      aircraft_manufacturer: "",
      aircraft_model: "",
      serial_number: "",
    };
  }
  return {
    tail_number: "",
    aircraft_year: "",
    serial_number: "",
  };
}

export function instancePatchForProfileModeSwitch(mode: AircraftProfileMode): Record<string, null> {
  if (mode === "general") {
    return { year: null, tailNumber: null, serialNumber: null };
  }
  return {};
}
