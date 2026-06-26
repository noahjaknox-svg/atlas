import type { AssumptionMap } from "./assumptions";
import { PROSPECT_EDITABLE_ASSUMPTIONS } from "./aircraft-workspace";

export { PROSPECT_EDITABLE_ASSUMPTIONS };

export type FieldType = "text" | "number" | "textarea" | "select" | "currency";

export type WorkspaceField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  /** Saves to prospect table instead of assumptions */
  prospectKey?: string;
  /** Saves to proposal table */
  proposalKey?: "proposalName" | "clientSummary";
  category?: string;
  assumptionName?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  colSpan?: 2;
  /** Calculated / read-only in workspace UI */
  readOnly?: boolean;
  /** Muted metadata (source, confidence, internal notes) */
  demoted?: boolean;
  /** Benchmark / reference — not a primary driver */
  reference?: boolean;
  /** Collapsed under accordion in revenue tab */
  accordionGroup?: string;
  /** Set on Pro Forma utilization panel — read-only on assumption tabs */
  proformaSource?: boolean;
  /** Hidden when usage type is Part 91 only (no charter). */
  charterOnly?: boolean;
  /** Shown only for the given aircraft profile mode. */
  profileMode?: "existing" | "general";
};

export type WorkspaceSectionDef = {
  id: string;
  label: string;
  description?: string;
  fields: WorkspaceField[];
};

const PROSPECT_TYPES = [
  { value: "individual_owner", label: "Individual owner" },
  { value: "company_owner", label: "Company owner" },
  { value: "family_office", label: "Family office" },
  { value: "broker_referral", label: "Broker referral" },
  { value: "aircraft_buyer", label: "Aircraft buyer" },
  { value: "existing_client", label: "Existing client" },
  { value: "other", label: "Other" },
];

const OPPORTUNITY_TYPES = [
  { value: "aircraft_management", label: "Aircraft management" },
  { value: "management_with_charter", label: "Management with charter" },
  { value: "part91_only", label: "Part 91 only" },
  { value: "acquisition_support", label: "Acquisition support" },
  { value: "transition", label: "Transition" },
  { value: "charter_optimization", label: "Charter optimization" },
  { value: "shared_ownership", label: "Shared ownership" },
  { value: "other", label: "Other" },
];

function assumptionField(
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

export const WORKSPACE_SECTIONS: WorkspaceSectionDef[] = [
  {
    id: "prospect",
    label: "Prospect",
    description: "Who this proposal is for and how we classify the opportunity.",
    fields: [
      { key: "prospectName", label: "Prospect name", required: true, prospectKey: "prospectName" },
      { key: "contactName", label: "Primary contact", required: true, prospectKey: "contactName" },
      { key: "contactEmail", label: "Email", type: "text", required: true, prospectKey: "contactEmail" },
      { key: "contactPhone", label: "Phone", prospectKey: "contactPhone" },
      {
        key: "prospectType",
        label: "Prospect type",
        type: "select",
        required: true,
        prospectKey: "prospectType",
        options: PROSPECT_TYPES,
      },
      {
        key: "internalNotes",
        label: "Internal notes",
        type: "textarea",
        prospectKey: "internalNotes",
        colSpan: 2,
      },
      {
        key: "clientSummary",
        label: "Prospect-facing summary",
        type: "textarea",
        prospectKey: "clientSummary",
        colSpan: 2,
      },
    ],
  },
  {
    id: "aircraft",
    label: "Aircraft",
    description: "Aircraft profile and valuation inputs for the pro forma.",
    fields: [
      assumptionField("aircraft", "aircraft_model", "Aircraft model", { required: true }),
      assumptionField("aircraft", "aircraft_year", "Year", { type: "number", required: true }),
      assumptionField("aircraft", "aircraft_value", "Estimated value ($)", {
        type: "number",
        required: true,
      }),
      assumptionField("aircraft", "proposed_home_base", "Proposed home base (ICAO)", {
        required: true,
      }),
      assumptionField("aircraft", "fuel_burn_gph", "Fuel burn (GPH)", { type: "number" }),
      assumptionField("aircraft", "aircraft_summary", "Prospect aircraft summary", {
        type: "textarea",
        colSpan: 2,
      }),
    ],
  },
  {
    id: "base",
    label: "Base Location",
    description: "Home airport economics and hangar costs.",
    fields: [
      assumptionField("base", "home_airport_icao", "Home airport ICAO", { required: true }),
      assumptionField("base", "home_fuel_price", "Home fuel ($/gal)", {
        type: "number",
        required: true,
      }),
      assumptionField("base", "away_fuel_price", "Away fuel ($/gal)", {
        type: "number",
        required: true,
      }),
      assumptionField("base", "home_fuel_pct", "% fuel at home", {
        type: "number",
        required: true,
      }),
      assumptionField("base", "hangar_pricing_mode", "Hangar price input", {
        type: "select",
        options: [
          { value: "monthly", label: "Per month" },
          { value: "annual", label: "Total annual price" },
        ],
      }),
      assumptionField("base", "hangar_monthly", "Monthly hangar cost", { type: "currency" }),
      assumptionField("base", "hangar_annual", "Annual hangar cost", { type: "currency" }),
    ],
  },
  {
    id: "operating",
    label: "Operating Model",
    description: "Utilization and charter hour assumptions.",
    fields: [
      assumptionField("operating", "operating_model", "Operating model", { required: true }),
      assumptionField("operating", "owner_annual_hours", "Owner annual hours", {
        type: "number",
        required: true,
      }),
      assumptionField("operating", "charter_block_hours", "Charter block hours", { type: "number" }),
      assumptionField("operating", "charter_flight_hours", "Charter flight hours", {
        type: "number",
      }),
    ],
  },
  {
    id: "crew",
    label: "Crew",
    description: "Annual crew and training cost inputs.",
    fields: [
      assumptionField("crew", "pic_salary", "PIC salary (annual)", { type: "number" }),
      assumptionField("crew", "sic_salary", "SIC salary (annual)", { type: "number" }),
      assumptionField("crew", "crew_total", "Total crew cost (annual)", { type: "number" }),
      assumptionField("crew", "pic_training", "PIC training (annual)", { type: "number" }),
      assumptionField("crew", "sic_training", "SIC training (annual)", { type: "number" }),
    ],
  },
  {
    id: "costs",
    label: "Costs & Programs",
    description: "Fixed costs, insurance, and maintenance program rates.",
    fields: [
      assumptionField("costs", "management_fee", "Management fee (annual)", { type: "number" }),
      assumptionField("costs", "insurance_annual", "Insurance (annual)", { type: "number" }),
      assumptionField("costs", "insurance_premium_percent", "Insurance % of hull", {
        type: "number",
      }),
      assumptionField("costs", "total_fixed_costs", "Total fixed costs", { type: "number" }),
      assumptionField("costs", "engine_program_rate", "Engine program ($/hr)", { type: "number" }),
      assumptionField("costs", "trip_expense_per_hour", "Trip expense ($/hr)", { type: "number" }),
    ],
  },
  {
    id: "features",
    label: "Feature Options",
    description: "Optional upgrades and add-ons (catalog reference for V1).",
    fields: [
      assumptionField("features", "features_notes", "Feature selections / notes", {
        type: "textarea",
        colSpan: 2,
        placeholder: "e.g. ADS-B, Wi-Fi, cabin refresh — costs applied in a future release",
      }),
    ],
  },
  {
    id: "charter",
    label: "Charter Revenue",
    description: "Charter rate and payback assumptions.",
    fields: [
      assumptionField("charter", "charter_rate", "Charter rate", { type: "number" }),
      assumptionField("charter", "charter_payback_pct", "Charter payback %", { type: "number" }),
      assumptionField("charter", "fuel_surcharge", "Fuel surcharge", { type: "number" }),
    ],
  },
];

export type ProspectFormState = {
  prospectName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  internalNotes: string;
  clientSummary: string;
};

export type ProspectSavePayload = ProspectFormState & {
  currentManager: string;
  assignedToId: string | null;
};

export type WorkspaceFormState = {
  proposalName: string;
  prospect: ProspectFormState;
  assumptions: AssumptionMap;
};

export function getFieldValue(
  state: WorkspaceFormState,
  field: WorkspaceField
): string {
  if (field.prospectKey) {
    return state.prospect[field.prospectKey as keyof ProspectFormState] ?? "";
  }
  if (field.proposalKey === "proposalName") {
    return state.proposalName ?? "";
  }
  if (field.assumptionName) {
    return state.assumptions[field.assumptionName] ?? "";
  }
  return "";
}

export function isFieldFilled(value: string): boolean {
  return value.trim().length > 0;
}

export function getSectionCompletion(
  section: WorkspaceSectionDef,
  state: WorkspaceFormState
): { complete: boolean; filled: number; required: number; missing: string[] } {
  const requiredFields = section.fields.filter((f) => f.required);
  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = getFieldValue(state, field);
    if (!isFieldFilled(value)) missing.push(field.label);
  }

  const optional = section.fields.filter((f) => !f.required);
  let filledOptional = 0;
  for (const field of optional) {
    if (isFieldFilled(getFieldValue(state, field))) filledOptional++;
  }

  const filledRequired = requiredFields.length - missing.length;
  const complete =
    section.id === "features" ||
    section.id === "sections"
      ? true
      : requiredFields.length === 0
        ? optional.length === 0 || filledOptional > 0
        : missing.length === 0;

  return {
    complete,
    filled: filledRequired + filledOptional,
    required: requiredFields.length,
    missing,
  };
}

export function getWorkspaceCompleteness(state: WorkspaceFormState): {
  percent: number;
  missingRequired: string[];
  sectionStatus: Record<string, { complete: boolean; missing: string[] }>;
} {
  const sectionStatus: Record<string, { complete: boolean; missing: string[] }> = {};
  const missingRequired: string[] = [];
  let totalRequired = 0;
  let filledRequired = 0;

  for (const section of WORKSPACE_SECTIONS) {
    const { complete, missing } = getSectionCompletion(section, state);
    sectionStatus[section.id] = { complete, missing };
    for (const label of missing) {
      missingRequired.push(`${section.label}: ${label}`);
    }
    const reqCount = section.fields.filter((f) => f.required).length;
    totalRequired += reqCount;
    filledRequired += reqCount - missing.length;
  }

  const percent =
    totalRequired === 0 ? 0 : Math.round((filledRequired / totalRequired) * 100);

  return { percent, missingRequired, sectionStatus };
}

const PROSPECT_EDITABLE_SET = new Set(
  PROSPECT_EDITABLE_ASSUMPTIONS.map((c) => c.name)
);

export function buildAssumptionPayload(
  state: WorkspaceFormState,
  fields: WorkspaceField[],
  clientEditable?: Record<string, boolean>
): Array<{
  category: string;
  assumptionName: string;
  value: string;
  sourceType: string;
  editableByClient?: boolean;
}> {
  return fields
    .filter((f) => f.category && f.assumptionName)
    .map((f) => {
      const name = f.assumptionName!;
      const patch: {
        category: string;
        assumptionName: string;
        value: string;
        sourceType: string;
        editableByClient?: boolean;
      } = {
        category: f.category!,
        assumptionName: name,
        value: state.assumptions[name] ?? "",
        sourceType: "manual",
      };
      if (
        (PROSPECT_EDITABLE_SET as Set<string>).has(name) &&
        clientEditable?.[name] !== undefined
      ) {
        patch.editableByClient = clientEditable[name];
      }
      return patch;
    });
}

export function buildAllAssumptionPayload(
  state: WorkspaceFormState,
  clientEditable?: Record<string, boolean>
) {
  const fields = WORKSPACE_SECTIONS.flatMap((s) => s.fields);
  return buildAssumptionPayload(state, fields, clientEditable);
}
