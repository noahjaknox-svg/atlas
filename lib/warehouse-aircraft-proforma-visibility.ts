import type { WarehouseAircraftField } from "@/lib/warehouse-aircraft-fields";
import { WAREHOUSE_AIRCRAFT_FIELDS } from "@/lib/warehouse-aircraft-fields";

/** Optional warehouse field → pro forma line-item keys hidden when field is set to Hide. */
export const WAREHOUSE_FIELD_PROFORMA_LINES: Partial<
  Record<WarehouseAircraftField["key"], string[]>
> = {
  partsProgram: ["charter_parts", "owner_parts"],
  engineProgram: ["charter_engine", "owner_engine"],
  apuProgram: ["charter_apu", "owner_apu"],
  inspectionReserve: ["charter_inspection", "owner_inspection"],
  tripExpenseHourly: ["owner_trip"],
  cabinAttendantCount: ["crew_salaries"],
  cabinAttendantSalary: ["crew_salaries"],
};

export function proformaToggleableFieldKeys(): string[] {
  return WAREHOUSE_AIRCRAFT_FIELDS.filter((f) => f.proformaToggleable).map((f) => f.key);
}

/** @deprecated Use proformaToggleableFieldKeys */
export function optionalWarehouseFieldKeys(): string[] {
  return proformaToggleableFieldKeys();
}

/** Default visibility for toggleable fields — all shown on pro forma (xlsx rule A2). */
export function defaultWarehouseFieldVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of proformaToggleableFieldKeys()) {
    out[key] = true;
  }
  return out;
}

export function parseWarehouseFieldVisibility(raw: unknown): Record<string, boolean> {
  const defaults = defaultWarehouseFieldVisibility();
  if (!raw || typeof raw !== "object") return defaults;
  const parsed = raw as Record<string, unknown>;
  for (const key of proformaToggleableFieldKeys()) {
    if (typeof parsed[key] === "boolean") defaults[key] = parsed[key];
  }
  return defaults;
}

/** Merge warehouse field Show/Hide into pro forma line visibility (false = hidden). */
export function buildProFormaLineVisibilityFromWarehouse(
  fieldVisibility: Record<string, boolean>
): Record<string, boolean> {
  const lines: Record<string, boolean> = {};
  for (const [fieldKey, lineKeys] of Object.entries(WAREHOUSE_FIELD_PROFORMA_LINES)) {
    const show = fieldVisibility[fieldKey] !== false;
    for (const lineKey of lineKeys ?? []) {
      lines[lineKey] = show;
    }
  }
  return lines;
}
