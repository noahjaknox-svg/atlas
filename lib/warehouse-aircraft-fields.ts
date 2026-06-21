// Single source of truth for the warehouse Aircraft record fields.
// Drives the Data Warehouse Aircraft form, API (de)serialization, and the
// proposal snapshot mapping. Mirrors the "Aircraft" tab in Atlas Database.xlsx.

import type { Prisma, WarehouseAircraft } from "@prisma/client";
import { parseWarehouseFieldVisibility } from "@/lib/warehouse-aircraft-proforma-visibility";

export type WarehouseFieldType = "text" | "int" | "decimal" | "bool" | "select";
export type WarehouseFieldFormat = "text" | "money" | "integer";

export interface WarehouseAircraftField {
  /** Prisma model field name. */
  key: keyof WarehouseAircraft & string;
  label: string;
  group: "General" | "Hourly Rates" | "Crew" | "Utilization" | "Finances";
  type: WarehouseFieldType;
  /** Required to publish; Show/Hide on pro forma only when `proformaToggleable` is true. */
  required: boolean;
  /** When true, the Data Warehouse form shows a Show/Hide toggle for pro forma (xlsx rule A2). */
  proformaToggleable?: boolean;
  format?: WarehouseFieldFormat;
  options?: { value: string; label: string }[];
}

export const PAYBACK_BASIS_OPTIONS = [
  { value: "block_time", label: "Block Time" },
  { value: "flight_time", label: "Flight Time" },
];

const CATEGORY_OPTIONS = [
  { value: "light_jet", label: "Light jet" },
  { value: "midsize_jet", label: "Midsize jet" },
  { value: "super_midsize_jet", label: "Super midsize jet" },
  { value: "large_cabin_jet", label: "Large cabin jet" },
  { value: "ultra_long_range_jet", label: "Ultra long range" },
  { value: "turboprop", label: "Turboprop" },
  { value: "piston", label: "Piston" },
  { value: "helicopter", label: "Helicopter" },
  { value: "other", label: "Other" },
];

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const WAREHOUSE_AIRCRAFT_FIELDS: WarehouseAircraftField[] = [
  // General
  { key: "displayName", label: "Display Name", group: "General", type: "text", required: true },
  { key: "manufacturer", label: "Manufacturer", group: "General", type: "text", required: true },
  { key: "model", label: "Model", group: "General", type: "text", required: true },
  { key: "modelCode", label: "Model Code", group: "General", type: "text", required: true },
  {
    key: "aircraftCategory",
    label: "Category",
    group: "General",
    type: "select",
    required: true,
    options: CATEGORY_OPTIONS,
  },
  {
    key: "passengerCapacity",
    label: "Passenger Capacity",
    group: "General",
    type: "int",
    required: true,
    format: "integer",
  },
  { key: "emptyRange", label: "Empty Range (nm)", group: "General", type: "int", required: true, format: "integer" },
  {
    key: "rangeAtMaxPassengers",
    label: "Range at Max Passengers (nm)",
    group: "General",
    type: "int",
    required: true,
    format: "integer",
  },
  { key: "crewCount", label: "Crew Count", group: "General", type: "int", required: true, format: "integer" },
  { key: "squareFootage", label: "Square Footage", group: "General", type: "int", required: true, format: "integer" },
  {
    key: "averageCruiseSpeed",
    label: "Average Cruise Speed (ktas)",
    group: "General",
    type: "int",
    required: true,
    format: "integer",
  },
  { key: "wifi", label: "WiFi", group: "General", type: "bool", required: true, options: YES_NO },
  {
    key: "homeFuelPct",
    label: "% Fuel at Home",
    group: "General",
    type: "int",
    required: true,
    format: "integer",
  },
  // Hourly Rates
  {
    key: "fuelGallonsPerHour",
    label: "Fuel Gallons Per Hour",
    group: "Hourly Rates",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "partsProgram",
    label: "Parts Program ($/hr)",
    group: "Hourly Rates",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  {
    key: "engineProgram",
    label: "Engine Program ($/hr)",
    group: "Hourly Rates",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  {
    key: "apuProgram",
    label: "APU Program ($/hr)",
    group: "Hourly Rates",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  {
    key: "inspectionReserve",
    label: "Inspection Reserve ($/hr)",
    group: "Hourly Rates",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  {
    key: "tripExpenseHourly",
    label: "Trip Expense Hourly ($/hr)",
    group: "Hourly Rates",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  // Crew — grouped by role in the UI (Lead → PIC → SIC → Cabin Attendant)
  { key: "leadPilotCount", label: "Lead Pilot Count", group: "Crew", type: "int", required: true, format: "integer" },
  { key: "leadPilotSalary", label: "Lead Pilot Salary", group: "Crew", type: "int", required: true, format: "money" },
  { key: "picCount", label: "PIC Count", group: "Crew", type: "int", required: true, format: "integer" },
  { key: "picSalary", label: "PIC Salary", group: "Crew", type: "int", required: true, format: "money" },
  {
    key: "picTrainingCost",
    label: "PIC Training Cost",
    group: "Crew",
    type: "int",
    required: true,
    format: "money",
  },
  { key: "sicCount", label: "SIC Count", group: "Crew", type: "int", required: true, format: "integer" },
  { key: "sicSalary", label: "SIC Salary", group: "Crew", type: "int", required: true, format: "money" },
  {
    key: "sicTrainingCost",
    label: "SIC Training Cost",
    group: "Crew",
    type: "int",
    required: true,
    format: "money",
  },
  {
    key: "cabinAttendantCount",
    label: "Cabin Attendant Count",
    group: "Crew",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "integer",
  },
  {
    key: "cabinAttendantSalary",
    label: "Cabin Attendant Salary",
    group: "Crew",
    type: "int",
    required: false,
    proformaToggleable: true,
    format: "money",
  },
  // Utilization
  {
    key: "maxUsage1Pilot",
    label: "Max Usage 1 Pilot (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "maxUsage2Pilots",
    label: "Max Usage 2 Pilots (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "maxUsage3Pilots",
    label: "Max Usage 3 Pilots (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "maxUsage4Pilots",
    label: "Max Usage 4 Pilots (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "maxUsage5Pilots",
    label: "Max Usage 5 Pilots (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  {
    key: "maxUsage6Pilots",
    label: "Max Usage 6 Pilots (hrs/yr)",
    group: "Utilization",
    type: "int",
    required: true,
    format: "integer",
  },
  // Finances
  { key: "averageCost", label: "Average Cost", group: "Finances", type: "int", required: true, format: "money" },
  {
    key: "charterHourlyRate",
    label: "Charter Hourly Rate",
    group: "Finances",
    type: "int",
    required: true,
    format: "money",
  },
  {
    key: "charterPaybackBasis",
    label: "Charter Payback Basis",
    group: "Finances",
    type: "select",
    required: true,
    options: PAYBACK_BASIS_OPTIONS,
  },
  {
    key: "fuelSurchargePaybackBasis",
    label: "Fuel Surcharge Payback Basis",
    group: "Finances",
    type: "select",
    required: true,
    options: PAYBACK_BASIS_OPTIONS,
  },
  {
    key: "fuelSurcharge",
    label: "Fuel Surcharge",
    group: "Finances",
    type: "int",
    required: true,
    format: "money",
  },
  {
    key: "pilotCharterIncentive",
    label: "Pilot Charter Incentive",
    group: "Finances",
    type: "int",
    required: true,
    format: "money",
  },
];

export function getMissingPublishFields(
  values: Record<string, string | null | undefined>
): WarehouseAircraftField[] {
  return WAREHOUSE_AIRCRAFT_FIELDS.filter((f) => {
    if (!f.required) return false;
    const v = values[f.key];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

export type SaveAs = "draft" | "publish";

export function parseSaveAs(body: Record<string, unknown>): SaveAs {
  if (body.saveAs === "publish") return "publish";
  if (body.status === "published") return "publish";
  return "draft";
}

/** Convert a request body into a Prisma data object for create/update. */
export function buildWarehouseAircraftData(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): Prisma.WarehouseAircraftUncheckedCreateInput {
  const data: Record<string, unknown> = {};

  if (body.saveAs === "draft" || body.status === "draft") data.status = "draft";
  if (body.saveAs === "publish" || body.status === "published") data.status = "published";

  if (body.proformaFieldVisibility !== undefined) {
    data.proformaFieldVisibility = body.proformaFieldVisibility;
  }

  for (const field of WAREHOUSE_AIRCRAFT_FIELDS) {
    const raw = body[field.key];
    if (raw === undefined) continue;
    if (raw === null || raw === "") {
      data[field.key] = null;
      continue;
    }
    switch (field.type) {
      case "int":
        data[field.key] = Math.round(Number(raw));
        break;
      case "decimal":
        data[field.key] = Number(raw);
        break;
      case "bool":
        data[field.key] = raw === true || raw === "true" || raw === "1";
        break;
      default:
        data[field.key] = String(raw);
    }
  }

  void opts;
  return data as Prisma.WarehouseAircraftUncheckedCreateInput;
}

export function applyPublishDefaults(
  data: Prisma.WarehouseAircraftUncheckedCreateInput
): Prisma.WarehouseAircraftUncheckedCreateInput {
  return {
    ...data,
    status: "published",
    charterPaybackBasis: data.charterPaybackBasis ?? "block_time",
    fuelSurchargePaybackBasis: data.fuelSurchargePaybackBasis ?? "block_time",
    wifi: data.wifi ?? true,
    aircraftCategory: data.aircraftCategory ?? "midsize_jet",
    homeFuelPct: data.homeFuelPct ?? 70,
  };
}

/** Flatten a WarehouseAircraft row into string-keyed values for tables/forms. */
export function serializeWarehouseAircraft(
  row: WarehouseAircraft
): Record<string, string | number | boolean | null | Record<string, boolean>> {
  const out: Record<string, string | number | boolean | null | Record<string, boolean>> = {
    id: row.id,
    status: row.status,
    proformaFieldVisibility: parseWarehouseFieldVisibility(row.proformaFieldVisibility),
  };
  for (const field of WAREHOUSE_AIRCRAFT_FIELDS) {
    const v = row[field.key];
    out[field.key] = v == null ? null : (v as string | number | boolean);
  }
  return out;
}
