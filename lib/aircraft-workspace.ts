import type { AssumptionMap } from "./assumptions";
import { OWNER_PROFORMA_HOURS_KEY } from "./proposal-owners";
import {
  getAircraftTypeLabel,
  normalizeAircraftProfileMode,
  requiredAssumptionKeysForProfileMode,
  fieldVisibleForProfileMode,
} from "./aircraft-profile-mode";
import type { WorkspaceField } from "./workspace-sections";
import { AIRCRAFT_TAB_FIELDS, getAllTabAssumptionFields } from "./aircraft-tab-fields";
import { VALUE_SOURCE_OPTIONS } from "./aircraft-constants";

export { VALUE_SOURCE_OPTIONS } from "./aircraft-constants";

export type AircraftTabId = "profile" | "operations" | "economics" | "output";

export type WorkspaceSectionId =
  | "profile"
  | "economics"
  | "proforma"
  | "output";

/** Prospect is always shown in the left sidebar — not in this nav list. */
export const WORKSPACE_NAV: { id: WorkspaceSectionId; label: string; aircraftScoped: boolean }[] = [
  { id: "profile", label: "Profile", aircraftScoped: true },
  { id: "economics", label: "Economics", aircraftScoped: true },
  { id: "proforma", label: "Demo Pro Forma", aircraftScoped: true },
  { id: "output", label: "Output", aircraftScoped: true },
];

export const USAGE_TYPE_OPTIONS = [
  { value: "part_91", label: "Part 91" },
  { value: "part_91_135", label: "Part 91 + Part 135" },
] as const;

export function usageTypeToOperatingModel(usageType: string): string {
  if (usageType === "part_91_135") return "Part 91 plus Part 135 charter";
  return "Part 91 management only";
}

export function normalizeUsageType(assumptions: AssumptionMap): string {
  const raw = assumptions.usage_type?.trim();
  if (raw === "part_91" || raw === "part_91_135") return raw;
  const opp = assumptions.opportunity_type ?? "";
  if (opp === "management_with_charter" || opp === "charter_optimization") return "part_91_135";
  return "part_91";
}

export type OperatingModelKind =
  | "part91"
  | "charter_hybrid"
  | "charter_heavy"
  | "acquisition";

export function resolveOperatingModelKind(model: string): OperatingModelKind {
  const m = model.toLowerCase();
  if (m.includes("acquisition")) return "acquisition";
  if (m.includes("charter-heavy") || m.includes("charter heavy")) return "charter_heavy";
  if (m.includes("charter") || m.includes("135") || m.includes("hybrid")) return "charter_hybrid";
  return "part91";
}

export const MODEL_COMPARISON_PRESETS: { label: string; operatingModel: string }[] = [
  { label: "Part 91 Only", operatingModel: "Part 91 management only" },
  { label: "Part 91 + Charter", operatingModel: "Part 91 plus Part 135 charter" },
  { label: "Charter-Heavy", operatingModel: "Charter-heavy managed aircraft" },
];

/** Filter economics field groups based on operating model (V1.1 §3.2). */
export function filterEconomicsGroupsForModel(
  groups: FieldGroup[],
  usageType: string
): FieldGroup[] {
  if (usageType !== "part_91_135") {
    return groups.filter((g) => g.title.toLowerCase() !== "charter");
  }
  return groups;
}

export type FieldGroup = {
  title: string;
  fields: WorkspaceField[];
};

export type AircraftTabDef = {
  id: AircraftTabId;
  label: string;
  groups: FieldGroup[];
};

export const OPPORTUNITY_TYPE_OPTIONS = [
  { value: "aircraft_management", label: "Aircraft management" },
  { value: "management_with_charter", label: "Management with charter" },
  { value: "part91_only", label: "Part 91 only" },
  { value: "acquisition_support", label: "Acquisition support" },
  { value: "transition", label: "Transition" },
  { value: "charter_optimization", label: "Charter optimization" },
  { value: "shared_ownership", label: "Shared ownership" },
  { value: "other", label: "Other" },
] as const;

export const AIRCRAFT_PURPOSE_OPTIONS = [
  { value: "current_aircraft", label: "Current aircraft" },
  { value: "acquisition_option", label: "Acquisition option" },
  { value: "comparison_aircraft", label: "Comparison aircraft" },
  { value: "replacement_aircraft", label: "Replacement aircraft" },
] as const;

export const PROSPECT_EDITABLE_ASSUMPTIONS = [
  { name: "aircraft_value", label: "Aircraft value" },
  { name: "owner_annual_hours", label: "Owner annual hours" },
] as const;

export const LEGACY_CATEGORIES = [
  "aircraft",
  "base",
  "operating",
  "crew",
  "costs",
  "features",
  "charter",
] as const;

export function aircraftAssumptionCategory(aircraftInstanceId: string): string {
  return `ac_${aircraftInstanceId}`;
}

function field(
  category: string,
  name: string,
  label: string,
  opts?: Partial<WorkspaceField>
): WorkspaceField {
  return {
    key: name,
    category,
    assumptionName: name,
    label,
    type: "text",
    ...opts,
  };
}

export function buildProfileFieldGroups(category: string): FieldGroup[] {
  return [
    {
      title: "Profile",
      fields: [
        field(category, "aircraft_year", "Year", { type: "number", required: true }),
        field(category, "tail_number", "Tail number"),
        field(category, "serial_number", "Serial number"),
        field(category, "aircraft_value", "Estimated aircraft value ($)", {
          type: "number",
          required: true,
        }),
        field(category, "value_source", "Value source", {
          type: "select",
          options: VALUE_SOURCE_OPTIONS,
        }),
        field(category, "hangar_monthly", "Monthly hangar", { type: "number" }),
        field(category, "hangar_annual", "Annual hangar", { type: "number" }),
        field(category, "home_fuel_price", "Home fuel ($/gal)", {
          type: "number",
          required: true,
        }),
        field(category, "away_fuel_price", "Away fuel ($/gal)", {
          type: "number",
          required: true,
        }),
        field(category, "home_fuel_pct", "% fuel at home", {
          type: "number",
          required: true,
        }),
        field(category, "fuel_burn_gph", "Fuel burn (GPH)", { type: "number" }),
        field(category, "features_notes", "Feature notes", {
          type: "textarea",
          colSpan: 2,
        }),
      ],
    },
  ];
}

export function buildEconomicsFieldGroups(category: string): FieldGroup[] {
  return [
    {
      title: "Operating",
      fields: [
        field(category, "owner_annual_hours", "Owner annual hours", {
          type: "number",
          required: true,
        }),
        field(category, "charter_block_hours", "Charter block hours", { type: "number" }),
        field(category, "charter_flight_hours", "Charter flight hours", { type: "number" }),
        field(category, "max_annual_utilization", "Max annual utilization", { type: "number" }),
        field(category, "cabin_attendant_required", "Cabin attendant required", {
          type: "select",
          options: [
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ],
        }),
      ],
    },
    {
      title: "Crew",
      fields: [
        field(category, "pic_count", "PIC count", { type: "number" }),
        field(category, "sic_count", "SIC count", { type: "number" }),
        field(category, "pic_salary", "PIC salary", { type: "number" }),
        field(category, "sic_salary", "SIC salary", { type: "number" }),
        field(category, "pic_training", "PIC training", { type: "number" }),
        field(category, "sic_training", "SIC training", { type: "number" }),
        field(category, "crew_total", "Total crew cost", { type: "number" }),
        field(category, "crew_notes", "Crew notes", { type: "textarea", colSpan: 2 }),
      ],
    },
    {
      title: "Fixed Costs",
      fields: [
        field(category, "management_fee", "Management fee", { type: "number" }),
        field(category, "maintenance_management_fee", "Maintenance management fee", {
          type: "number",
        }),
        field(category, "insurance_annual", "Insurance annual", { type: "number" }),
        field(category, "insurance_premium_percent", "Insurance % of hull", {
          type: "number",
        }),
        field(category, "total_fixed_costs", "Total fixed costs", { type: "number" }),
      ],
    },
    {
      title: "Variable & Programs",
      fields: [
        field(category, "engine_program_rate", "Engine program hourly rate", {
          type: "number",
        }),
        field(category, "apu_program_rate", "APU program hourly rate", { type: "number" }),
        field(category, "parts_program_rate", "Parts program hourly rate", { type: "number" }),
        field(category, "inspection_reserve_rate", "Inspection reserve hourly rate", {
          type: "number",
        }),
        field(category, "trip_expense_per_hour", "Trip expense hourly rate", { type: "number" }),
      ],
    },
    {
      title: "Charter",
      fields: [
        field(category, "charter_rate", "Charter rate", { type: "number" }),
        field(category, "charter_payback_pct", "Charter payback percentage", { type: "number" }),
        field(category, "fuel_surcharge", "Fuel surcharge", { type: "number" }),
      ],
    },
  ];
}

/** All persisted assumption fields for autosave. */
export function buildAircraftTabFields(category: string): AircraftTabDef[] {
  const profileGroups = buildProfileFieldGroups(category);
  const economicsGroups = buildEconomicsFieldGroups(category);
  const setupFields: WorkspaceField[] = [
    field(category, "aircraft_model", "Aircraft model", { required: true }),
    field(category, "home_airport_icao", "Home airport ICAO", { required: true }),
    field(category, "proposed_home_base", "Proposed home base", { required: true }),
    field(category, "fbo_name", "FBO"),
    field(category, "usage_type", "Usage type", { required: true }),
    field(category, "operating_model", "Operating model", { required: true }),
  ];

  return [
    {
      id: "profile",
      label: "Profile",
      groups: [{ title: "Setup", fields: setupFields }, ...profileGroups],
    },
    {
      id: "economics",
      label: "Economics",
      groups: economicsGroups,
    },
    {
      id: "output",
      label: "Output",
      groups: [],
    },
  ];
}

export function getAllAircraftEditorFields(category: string): WorkspaceField[] {
  const setupFields: WorkspaceField[] = [
    field(category, "aircraft_master_id", "Aircraft master id"),
    field(category, "home_airport_icao", "Home airport ICAO", { required: true }),
    field(category, "proposed_home_base", "Proposed home base"),
    field(category, "fbo_name", "FBO"),
    field(category, "usage_type", "Usage type", { required: true }),
    field(category, "operating_model", "Operating model"),
  ];
  const tabFields = getAllTabAssumptionFields();
  return [...setupFields, ...tabFields].map((f) => ({ ...f, category }));
}

export type AircraftCardMeta = {
  id: string;
  year: number | null;
  tailNumber: string | null;
  serialNumber: string | null;
  proposedHomeBaseIcao: string | null;
  estimatedValue: string | null;
  valueSource: string | null;
  aircraftMaster: { manufacturer: string | null; model: string | null } | null;
};

export function getAircraftDisplayName(
  assumptions: AssumptionMap,
  meta: AircraftCardMeta
): string {
  const mode = normalizeAircraftProfileMode(assumptions);
  if (mode === "existing") {
    const tail = assumptions.tail_number?.trim() || meta.tailNumber?.trim();
    if (tail) return tail;
  }

  const typeLabel = getAircraftTypeLabel(assumptions);
  if (typeLabel) return typeLabel;

  if (meta.aircraftMaster) {
    const m = meta.aircraftMaster;
    if (m.manufacturer && m.model) return `${m.manufacturer} ${m.model}`;
    if (m.model) return m.model;
  }

  const legacy = assumptions.aircraft_model?.trim();
  if (legacy && legacy.includes(" ")) return legacy;

  return "New aircraft";
}

export function getAircraftCardSubtitle(
  assumptions: AssumptionMap,
  meta: AircraftCardMeta
): string | null {
  const mode = normalizeAircraftProfileMode(assumptions);

  if (mode === "existing") {
    const typeLabel =
      getAircraftTypeLabel(assumptions) ??
      (meta.aircraftMaster
        ? [meta.aircraftMaster.manufacturer, meta.aircraftMaster.model]
            .filter(Boolean)
            .join(" ")
        : null);
    return typeLabel || null;
  }

  const base = assumptions.proposed_home_base || meta.proposedHomeBaseIcao;
  return base || null;
}

function isRequiredFieldFilled(
  assumptions: AssumptionMap,
  key: string
): boolean {
  return Boolean(assumptions[key]?.trim());
}

function getRequiredKeysForReady(assumptions: AssumptionMap): string[] {
  const mode = normalizeAircraftProfileMode(assumptions);
  return [
    ...requiredAssumptionKeysForProfileMode(mode),
    "aircraft_value",
    "home_airport_icao",
    "home_fuel_price",
    "away_fuel_price",
    "home_fuel_pct",
    "usage_type",
    "owner_annual_hours",
  ];
}

export type AircraftBadge = "ready" | "missing";

export function getAircraftBadge(assumptions: AssumptionMap): AircraftBadge {
  const missing = getRequiredKeysForReady(assumptions).some(
    (k) => !isRequiredFieldFilled(assumptions, k)
  );
  return missing ? "missing" : "ready";
}

export function getAircraftCompleteness(assumptions: AssumptionMap): {
  percent: number;
  missing: string[];
} {
  const missing: string[] = [];
  let total = 0;
  let filled = 0;
  const mode = normalizeAircraftProfileMode(assumptions);

  const fields = getAllTabAssumptionFields();
  for (const f of fields) {
    if (!f.required || !f.assumptionName || f.readOnly) continue;
    if (!fieldVisibleForProfileMode(f, mode)) continue;
    total++;
    const v = assumptions[f.assumptionName] ?? "";
    if (!v.trim()) missing.push(f.label);
    else filled++;
  }
  if (!assumptions.home_airport_icao?.trim()) missing.push("Home base");
  if (!assumptions.usage_type?.trim()) missing.push("Usage type");

  return {
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    missing,
  };
}

export function assumptionsMapForCategory(
  all: Array<{ category: string; assumptionName: string; value: string }>,
  category: string
): AssumptionMap {
  const map: AssumptionMap = {};
  for (const a of all) {
    if (a.category === category) map[a.assumptionName] = a.value;
  }
  return map;
}

/** Assumption keys persisted outside tab field definitions. */
export const META_ASSUMPTION_KEYS = [
  "proforma_line_visibility",
  OWNER_PROFORMA_HOURS_KEY,
  "owner_annual_hours",
  "crew_step_index",
  "charter_block_hours",
  "charter_flight_hours",
  "charter_block_to_flight_ratio",
] as const;

export function buildMetaAssumptionPayload(
  category: string,
  assumptions: AssumptionMap
): Array<{ category: string; assumptionName: string; value: string; sourceType: string }> {
  return META_ASSUMPTION_KEYS.filter((k) => assumptions[k] != null && assumptions[k] !== "").map(
    (k) => ({
      category,
      assumptionName: k,
      value: assumptions[k]!,
      sourceType: "manual",
    })
  );
}

export function buildPayloadForCategory(
  category: string,
  assumptions: AssumptionMap,
  fields: WorkspaceField[],
  clientEditable?: Record<string, boolean>
) {
  const editableSet = new Set<string>(PROSPECT_EDITABLE_ASSUMPTIONS.map((c) => c.name));
  return fields
    .filter((f) => f.category === category && f.assumptionName)
    .map((f) => {
      const name = f.assumptionName!;
      const patch: {
        category: string;
        assumptionName: string;
        value: string;
        sourceType: string;
        editableByClient?: boolean;
      } = {
        category,
        assumptionName: name,
        value: assumptions[name] ?? "",
        sourceType: "manual",
      };
      if (editableSet.has(name) && clientEditable?.[name] !== undefined) {
        patch.editableByClient = clientEditable[name];
      }
      return patch;
    });
}

/** Copy prospect-level opportunity onto aircraft assumptions when missing. */
export function applyProspectOpportunityFallback(
  assumptionMap: AssumptionMap,
  prospectOpportunityType: string
): AssumptionMap {
  if (assumptionMap.usage_type?.trim()) return assumptionMap;
  const usage =
    prospectOpportunityType === "management_with_charter" ||
    prospectOpportunityType === "charter_optimization"
      ? "part_91_135"
      : "part_91";
  return {
    ...assumptionMap,
    usage_type: usage,
    operating_model: usageTypeToOperatingModel(usage),
    opportunity_type: prospectOpportunityType,
  };
}

export function mergeLegacyAssumptions(
  all: Array<{ category: string; assumptionName: string; value: string }>,
  targetCategory: string
): AssumptionMap {
  const merged = assumptionsMapForCategory(all, targetCategory);
  if (Object.keys(merged).length > 0) return merged;

  const useLegacy =
    targetCategory.startsWith("ac_") || targetCategory === "__legacy__";
  if (!useLegacy) return merged;

  const legacy: AssumptionMap = {};
  for (const a of all) {
    if ((LEGACY_CATEGORIES as readonly string[]).includes(a.category)) {
      legacy[a.assumptionName] = a.value;
    }
  }
  return legacy;
}

/** Map assumption keys to aircraft instance columns for persistence. */
export function instancePatchFromAssumptions(assumptions: AssumptionMap) {
  const mode = normalizeAircraftProfileMode(assumptions);
  if (mode === "general") {
    return {
      year: null,
      tailNumber: null,
      serialNumber: null,
      proposedHomeBaseIcao:
        assumptions.proposed_home_base || assumptions.home_airport_icao || null,
      estimatedValue: assumptions.aircraft_value || null,
      valueSource: assumptions.value_source || null,
      aircraftMasterId: assumptions.aircraft_master_id?.trim() || null,
    };
  }
  return {
    year: assumptions.aircraft_year ? parseInt(assumptions.aircraft_year, 10) : null,
    tailNumber: assumptions.tail_number || null,
    serialNumber: null,
    proposedHomeBaseIcao:
      assumptions.proposed_home_base || assumptions.home_airport_icao || null,
    estimatedValue: assumptions.aircraft_value || null,
    valueSource: assumptions.value_source || null,
    aircraftMasterId: assumptions.aircraft_master_id?.trim() || null,
  };
}

export function assumptionsFromInstance(meta: AircraftCardMeta): AssumptionMap {
  const map: AssumptionMap = {};
  if (meta.year) map.aircraft_year = String(meta.year);
  if (meta.tailNumber) map.tail_number = meta.tailNumber;
  if (meta.serialNumber) map.serial_number = meta.serialNumber;
  if (meta.proposedHomeBaseIcao) map.proposed_home_base = meta.proposedHomeBaseIcao;
  if (meta.estimatedValue) map.aircraft_value = meta.estimatedValue;
  if (meta.valueSource) map.value_source = meta.valueSource;
  return map;
}
