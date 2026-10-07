import type { AircraftTypeField } from "@/lib/warehouse-aircraft-fields";
import { WAREHOUSE_AIRCRAFT_FIELDS } from "@/lib/warehouse-aircraft-fields";
import { isCustomLineItemKey } from "@/lib/line-item-catalog";

/** Optional warehouse field → pro forma line-item keys hidden when field is set to Hide. */
export const WAREHOUSE_FIELD_PROFORMA_LINES: Partial<
  Record<AircraftTypeField["key"], string[]>
> = {
  partsProgram: ["charter_parts", "owner_parts"],
  engineProgram: ["charter_engine", "owner_engine"],
  apuProgram: ["charter_apu", "owner_apu"],
  inspectionReserve: ["charter_inspection", "owner_inspection"],
  airframeProgram: ["charter_airframe", "owner_airframe"],
  maintenanceReserve: ["charter_maintenance", "owner_maintenance"],
  tripExpenseHourly: ["owner_trip"],
  wifiAnnual: ["wifi_pl"],
  subscriptionsAnnual: ["subscriptions_pl"],
  cleaningAnnual: ["cleaning_pl"],
  suppliesAnnual: ["supplies_pl"],
  airportFeesAnnual: ["airport_fees_pl"],
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
  // Custom line items (Data Warehouse → Line Items) are toggled by their `li_*` key.
  for (const [key, value] of Object.entries(parsed)) {
    if (isCustomLineItemKey(key) && typeof value === "boolean") defaults[key] = value;
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
  // A custom item's rows: `li_x` (fixed/revenue) or `charter_li_x` / `owner_li_x` (hourly).
  for (const [key, show] of Object.entries(fieldVisibility)) {
    if (!isCustomLineItemKey(key)) continue;
    for (const lineKey of [key, `charter_${key}`, `owner_${key}`]) lines[lineKey] = show;
  }
  return lines;
}
