import type { WorkspaceField } from "@/lib/workspace-sections";
import {
  VALUE_SOURCE_OPTIONS,
  YES_NO_OPTIONS,
  CREW_MODEL_OPTIONS,
  FET_TREATMENT_OPTIONS,
  FUEL_SOURCE_OPTIONS,
  HANGAR_SOURCE_OPTIONS,
  INSURANCE_MODE_OPTIONS,
} from "@/lib/aircraft-constants";
import { CALCULATED_ASSUMPTION_KEYS } from "@/lib/aircraft-calculated-fields";

export type AircraftWorkspaceTab =
  | "aircraft"
  | "crew_training"
  | "base_hangar"
  | "utilization_costs"
  | "financing_fees"
  | "revenue"
  | "pro_forma";

export type SectionProFormaRollup = {
  label: string;
  type: "sum" | "calculated" | "proforma" | "line" | "lines" | "hourly" | "value";
  sumKeys?: string[];
  valueKey?: string;
  proformaLine?: string;
  /** Sum multiple P&L line keys (e.g. charter + owner flight cost for same rate). */
  proformaLines?: string[];
  /** When set, append owner flight cost for this paired line in the footer hint */
  proformaLineOwner?: string;
  format?: "currency" | "number" | "ratio" | "hours" | "percent";
  proFormaHint?: string;
  proformaMetric?:
    | "charter_revenue"
    | "fuel_surcharge"
    | "charter_revenue_total"
    | "total_revenue"
    | "charter_variable"
    | "owner_variable"
    | "net_annual";
};

export type AircraftTabGroup = {
  title: string;
  fields: WorkspaceField[];
  proFormaRollup?: SectionProFormaRollup;
  /** Entire group hidden for Part 91-only usage. */
  charterOnly?: boolean;
};

export type AircraftTabSection = {
  title: string;
  groups: AircraftTabGroup[];
  proFormaRollup?: SectionProFormaRollup;
  /** Entire section hidden for Part 91-only usage (e.g. Net Revenue). */
  charterOnly?: boolean;
};

function field(
  name: string,
  label: string,
  opts?: Partial<WorkspaceField> & { calculated?: boolean }
): WorkspaceField {
  const { calculated, ...rest } = opts ?? {};
  return {
    key: name,
    category: "",
    assumptionName: name,
    label,
    type: "text",
    ...rest,
    ...(calculated || CALCULATED_ASSUMPTION_KEYS.has(name) ? { readOnly: true } : {}),
  };
}

function lineRollup(
  label: string,
  proformaLine: string,
  hint?: string,
  ownerLine?: string
): SectionProFormaRollup {
  return {
    label,
    type: "line",
    proformaLine,
    proFormaHint: hint,
    proformaLineOwner: ownerLine,
  };
}

/** Sum hourly rate fields for workspace footer (P&L applies hours separately). */
function hourlyRateRollup(label: string, rateKey: string): SectionProFormaRollup {
  return {
    label,
    type: "hourly",
    sumKeys: [rateKey],
    format: "currency",
    proFormaHint: "Per flight hour · applied on Pro Forma",
  };
}

const OPERATING_HOURLY_RATE_KEYS = [
  "fuel_cost_per_hour",
  "parts_program_rate",
  "engine_program_rate",
  "apu_program_rate",
  "airframe_program_rate",
  "inspection_reserve_rate",
  "maintenance_reserve_rate",
  "trip_expense_per_hour",
] as const;

export const AIRCRAFT_TAB_SECTIONS: Record<
  Exclude<AircraftWorkspaceTab, "pro_forma">,
  AircraftTabSection[]
> = {
  aircraft: [
    {
      title: "Aircraft Identity",
      groups: [
        {
          title: "Identity",
          fields: [
            field("aircraft_manufacturer", "Manufacturer", { required: true }),
            field("aircraft_model", "Model", { required: true }),
            field("aircraft_year", "Year", { type: "number", required: true }),
            field("tail_number", "Tail number"),
            field("serial_number", "Serial number"),
          ],
        },
      ],
    },
    {
      title: "Performance Reference",
      groups: [
        {
          title: "Performance",
          fields: [
            field("passenger_capacity", "Passenger capacity", { type: "number" }),
            field("typical_range", "Typical range", { type: "number" }),
            field("typical_cruise_speed", "Typical cruise speed", { type: "number" }),
            field("wifi_features", "Wi-Fi / features"),
          ],
        },
      ],
    },
    {
      title: "Client-Facing Summary",
      groups: [
        {
          title: "Summary",
          fields: [
            field("features_notes", "Feature notes", { type: "textarea", colSpan: 2 }),
            field("aircraft_summary", "Client aircraft summary", { type: "textarea", colSpan: 2 }),
          ],
        },
      ],
    },
  ],
  crew_training: [
    {
      title: "Crew Salaries & Benefits",
      groups: [
        {
          title: "Benefits",
          fields: [field("benefits_pct", "Benefits percentage", { type: "number" })],
        },
        {
          title: "PIC",
          fields: [
            field("pic_count", "PIC count", { type: "number" }),
            field("pic_salary", "PIC salary (annual, per pilot)", { type: "number" }),
          ],
          proFormaRollup: {
            label: "PIC total",
            type: "calculated",
            valueKey: "pic_crew_total",
            format: "currency",
            proFormaHint: "Included in P&L: Crew Salaries & Benefits",
          },
        },
        {
          title: "SIC",
          fields: [
            field("sic_count", "SIC count", { type: "number" }),
            field("sic_salary", "SIC salary (annual, per pilot)", { type: "number" }),
          ],
          proFormaRollup: {
            label: "SIC total",
            type: "calculated",
            valueKey: "sic_crew_total",
            format: "currency",
            proFormaHint: "Included in P&L: Crew Salaries & Benefits",
          },
        },
        {
          title: "Cabin",
          fields: [
            field("cabin_attendant_count", "Cabin attendant count", { type: "number" }),
            field("cabin_attendant_annual_cost", "Cabin attendant annual cost", {
              type: "number",
            }),
          ],
          proFormaRollup: {
            label: "Cabin total",
            type: "calculated",
            valueKey: "cabin_crew_total",
            format: "currency",
            proFormaHint: "Included in P&L: Crew Salaries & Benefits",
          },
        },
        {
          title: "Crew model",
          fields: [
            field("crew_model", "Crew model", { type: "select", options: CREW_MODEL_OPTIONS }),
          ],
        },
      ],
      proFormaRollup: lineRollup(
        "Crew Salaries & Benefits",
        "crew_salaries",
        "P&L fixed ownership"
      ),
    },
    {
      title: "Training",
      groups: [
        {
          title: "PIC Training",
          fields: [field("pic_training", "PIC training (annual)", { type: "number" })],
          proFormaRollup: lineRollup("PIC Training", "pic_training_pl"),
        },
        {
          title: "SIC Training",
          fields: [field("sic_training", "SIC training (annual)", { type: "number" })],
          proFormaRollup: lineRollup("SIC Training", "sic_training_pl"),
        },
      ],
    },
    {
      title: "Notes",
      groups: [
        {
          title: "Crew notes",
          fields: [field("crew_notes", "Crew notes", { type: "textarea", colSpan: 2 })],
        },
      ],
    },
  ],
  base_hangar: [
    {
      title: "Base Airport",
      groups: [
        {
          title: "Home base",
          fields: [
            field("proposed_home_base", "Home base / airport"),
            field("fbo_name", "FBO"),
          ],
        },
      ],
    },
    {
      title: "Hangar",
      groups: [
        {
          title: "Hangar",
          fields: [
            field("hangar_monthly", "Monthly hangar", { type: "number" }),
            field("hangar_annual", "Annual hangar", { type: "number", calculated: true }),
          ],
          proFormaRollup: lineRollup("Hangar", "hangar_pl"),
        },
      ],
    },
    {
      title: "Source & Confidence",
      groups: [
        {
          title: "Sources",
          fields: [
            field("hangar_source", "Hangar source", {
              type: "select",
              options: HANGAR_SOURCE_OPTIONS,
              demoted: true,
            }),
          ],
        },
      ],
    },
  ],
  utilization_costs: [
    {
      title: "Utilization",
      groups: [
        {
          title: "Hours & ratio",
          fields: [
            field("max_annual_utilization", "Max annual utilization", {
              type: "number",
              reference: true,
            }),
            field("charter_block_to_flight_ratio", "Block-to-Flight Factor", {
              type: "number",
            }),
          ],
        },
      ],
    },
    {
      title: "Operating Costs",
      groups: [
        {
          title: "Fuel",
          fields: [
            field("home_fuel_price", "Home fuel ($/gal)", { type: "number", required: true }),
            field("away_fuel_price", "Away fuel ($/gal)", { type: "number", required: true }),
            field("home_fuel_pct", "% fuel at home", { type: "number", required: true }),
            field("blended_fuel_price", "Blended fuel price ($/gal)", {
              type: "number",
              calculated: true,
            }),
            field("fuel_burn_gph", "Fuel burn (GPH)", { type: "number" }),
            field("fuel_cost_per_hour", "Fuel cost per hour", {
              type: "number",
              calculated: true,
            }),
            field("fuel_source", "Fuel source", {
              type: "select",
              options: FUEL_SOURCE_OPTIONS,
              demoted: true,
            }),
          ],
          proFormaRollup: hourlyRateRollup("Fuel", "fuel_cost_per_hour"),
        },
        {
          title: "Parts Programs",
          fields: [field("parts_program_rate", "Parts program hourly rate", { type: "number" })],
          proFormaRollup: hourlyRateRollup("Parts Programs", "parts_program_rate"),
        },
        {
          title: "Engine Programs",
          fields: [field("engine_program_rate", "Engine program hourly rate", { type: "number" })],
          proFormaRollup: hourlyRateRollup("Engine Programs", "engine_program_rate"),
        },
        {
          title: "APU Programs",
          fields: [field("apu_program_rate", "APU program hourly rate", { type: "number" })],
          proFormaRollup: hourlyRateRollup("APU Programs", "apu_program_rate"),
        },
        {
          title: "Airframe Programs",
          fields: [
            field("airframe_program_rate", "Airframe program hourly rate", { type: "number" }),
          ],
          proFormaRollup: hourlyRateRollup("Airframe Programs", "airframe_program_rate"),
        },
        {
          title: "Inspection Reserve",
          fields: [
            field("inspection_reserve_rate", "Inspection reserve hourly rate", {
              type: "number",
            }),
          ],
          proFormaRollup: hourlyRateRollup("Inspection Reserve", "inspection_reserve_rate"),
        },
        {
          title: "Maintenance Reserve",
          fields: [
            field("maintenance_reserve_rate", "Maintenance reserve hourly rate", {
              type: "number",
            }),
          ],
          proFormaRollup: hourlyRateRollup("Maintenance Reserve", "maintenance_reserve_rate"),
        },
        {
          title: "Owner trip expense",
          fields: [
            field("trip_expense_per_hour", "Trip expense hourly rate (owner)", {
              type: "number",
            }),
          ],
          proFormaRollup: hourlyRateRollup("Owner trip expense", "trip_expense_per_hour"),
        },
        {
          title: "Variable cost per hour",
          fields: [
            field("variable_cost_per_hour", "Variable cost per hour", {
              type: "number",
              calculated: true,
            }),
          ],
        },
      ],
      proFormaRollup: {
        label: "Total variable cost per hour",
        type: "hourly",
        sumKeys: [...OPERATING_HOURLY_RATE_KEYS],
        format: "currency",
        proFormaHint: "Hourly rates · multiplied by hours on Pro Forma",
      },
    },
  ],
  revenue: [
    {
      title: "Revenue",
      charterOnly: true,
      groups: [
        {
          title: "Charter rate",
          charterOnly: true,
          fields: [
            field("charter_rate", "Charter rate ($/block hr)", {
              type: "number",
              charterOnly: true,
            }),
          ],
          proFormaRollup: lineRollup("Charter Revenue (Block Time)", "charter_revenue_block"),
        },
        {
          title: "Fuel surcharge",
          charterOnly: true,
          fields: [
            field("fuel_surcharge", "Fuel surcharge ($/block hr)", {
              type: "number",
              charterOnly: true,
            }),
          ],
          proFormaRollup: lineRollup("Fuel Surcharge", "fuel_surcharge"),
        },
        {
          title: "Jet fuel tax differential",
          charterOnly: true,
          fields: [
            field("jet_fuel_tax_differential_per_gal", "Jet fuel tax differential ($/gal)", {
              type: "number",
              charterOnly: true,
            }),
            field("jet_fuel_tax_credit_per_hour", "Jet fuel tax credit ($/hr)", {
              type: "number",
              calculated: true,
              charterOnly: true,
            }),
            field("fet_treatment", "Tax credit treatment", {
              type: "select",
              options: FET_TREATMENT_OPTIONS,
              charterOnly: true,
            }),
            field("fet_refund_amount", "Jet fuel tax differential credit (annual)", {
              type: "number",
              calculated: true,
              charterOnly: true,
            }),
          ],
          proFormaRollup: lineRollup("Jet Fuel Tax Differential Credit", "fet_refund"),
        },
        {
          title: "Pilot charter incentive",
          charterOnly: true,
          fields: [
            field(
              "pilot_charter_incentive_per_hour",
              "Pilot charter incentive ($/charter flight hr)",
              { type: "number", charterOnly: true }
            ),
          ],
          proFormaRollup: lineRollup("Pilot Charter Incentive", "pilot_charter_incentive_pl"),
        },
      ],
      proFormaRollup: lineRollup("Total Revenue", "total_revenue"),
    },
  ],
  financing_fees: [
    {
      title: "Value & Market Reference",
      groups: [
        {
          title: "Hull value",
          fields: [
            field("aircraft_value", "Estimated value", { type: "number", required: true }),
            field("value_source", "Value source", {
              type: "select",
              options: VALUE_SOURCE_OPTIONS,
            }),
          ],
        },
      ],
    },
    {
      title: "Fixed Ownership Costs",
      groups: [
        {
          title: "Management Fee",
          fields: [field("management_fee", "Management fee (annual)", { type: "number" })],
          proFormaRollup: lineRollup("Management Fee", "management_fee_pl"),
        },
        {
          title: "Maintenance Management Fee",
          fields: [
            field("maintenance_management_fee", "Maintenance management fee (annual)", {
              type: "number",
            }),
          ],
          proFormaRollup: lineRollup(
            "Maintenance Management Fee",
            "maint_mgmt_fee_pl"
          ),
        },
        {
          title: "Insurance (Hull & Liability)",
          fields: [
            field("insurance_mode", "Insurance input mode", {
              type: "select",
              options: INSURANCE_MODE_OPTIONS,
            }),
            field("insurance_annual", "Insurance annual", { type: "number" }),
            field("insurance_premium_percent", "Insurance percent of hull", { type: "number" }),
          ],
          proFormaRollup: lineRollup("Insurance (Hull & Liability)", "insurance_pl"),
        },
        {
          title: "Registration / Taxes",
          fields: [
            field("registration_tax_rate", "Registration tax rate (% of hull value)", {
              type: "number",
            }),
            field("registration_annual", "Registration / taxes (annual)", {
              type: "number",
              calculated: true,
            }),
          ],
          proFormaRollup: lineRollup("Registration / Taxes", "registration_pl"),
        },
        {
          title: "In-Flight Wi-Fi",
          fields: [field("wifi_annual", "In-flight Wi-Fi (annual)", { type: "number" })],
          proFormaRollup: lineRollup("In-Flight Wi-Fi", "wifi_pl"),
        },
        {
          title: "Subscriptions",
          fields: [field("subscriptions_annual", "Subscriptions (annual)", { type: "number" })],
          proFormaRollup: lineRollup("Subscriptions", "subscriptions_pl"),
        },
        {
          title: "Cleaning",
          fields: [field("cleaning_annual", "Cleaning (annual)", { type: "number" })],
          proFormaRollup: lineRollup("Cleaning", "cleaning_pl"),
        },
        {
          title: "Supplies",
          fields: [field("supplies_annual", "Supplies (annual)", { type: "number" })],
          proFormaRollup: lineRollup("Supplies", "supplies_pl"),
        },
        {
          title: "Airport Fees",
          fields: [field("airport_fees_annual", "Airport fees (annual)", { type: "number" })],
          proFormaRollup: lineRollup("Airport Fees", "airport_fees_pl"),
        },
      ],
      proFormaRollup: lineRollup("Total Fixed Ownership Costs", "total_fixed_ownership"),
    },
    {
      title: "Financing",
      groups: [
        {
          title: "Loan",
          fields: [
            field("financing_enabled", "Financing enabled", {
              type: "select",
              options: YES_NO_OPTIONS,
            }),
            field("loan_amount", "Loan amount", { type: "number" }),
            field("down_payment", "Down payment", { type: "number" }),
            field("interest_rate", "Interest rate", { type: "number" }),
            field("term_months", "Term (months)", { type: "number" }),
            field("balloon_payment", "Balloon payment", { type: "number" }),
            field("monthly_debt_service", "Monthly debt service", {
              type: "number",
              calculated: true,
            }),
          ],
          proFormaRollup: {
            label: "Monthly debt service",
            type: "calculated",
            valueKey: "monthly_debt_service",
            format: "currency",
            proFormaHint: "Not on operating P&L; owner financing reference",
          },
        },
      ],
    },
  ],
};

export function sectionFields(section: AircraftTabSection): WorkspaceField[] {
  return section.groups.flatMap((g) => g.fields);
}

export const AIRCRAFT_TAB_FIELDS: Record<
  Exclude<AircraftWorkspaceTab, "pro_forma">,
  WorkspaceField[]
> = Object.fromEntries(
  Object.entries(AIRCRAFT_TAB_SECTIONS).map(([tab, sections]) => [
    tab,
    sections.flatMap((s) => sectionFields(s)),
  ])
) as Record<Exclude<AircraftWorkspaceTab, "pro_forma">, WorkspaceField[]>;

export const AIRCRAFT_TAB_ORDER: AircraftWorkspaceTab[] = [
  "aircraft",
  "crew_training",
  "base_hangar",
  "utilization_costs",
  "financing_fees",
  "revenue",
  "pro_forma",
];

export const AIRCRAFT_EDITOR_TAB_ORDER = AIRCRAFT_TAB_ORDER.filter((t) => t !== "pro_forma");

export function editorTabsForAssumptions(assumptions: {
  usage_type?: string;
  operating_model?: string;
}): Exclude<AircraftWorkspaceTab, "pro_forma">[] {
  const charter =
    assumptions.usage_type === "part_91_135" ||
    assumptions.operating_model === "Part 91 plus Part 135 charter";
  return AIRCRAFT_EDITOR_TAB_ORDER.filter((t) => t !== "revenue" || charter);
}

export const TAB_LABELS: Record<AircraftWorkspaceTab, string> = {
  aircraft: "Aircraft",
  crew_training: "Crew & Training",
  base_hangar: "Base & Hangar",
  utilization_costs: "Utilization & Operating Costs",
  financing_fees: "Financing & Fees",
  revenue: "Revenue",
  pro_forma: "Pro Forma",
};

/** Shorter labels for the configurator tab strip (full name in `title`). */
export const TAB_STRIP_LABELS: Record<
  Exclude<AircraftWorkspaceTab, "pro_forma">,
  string
> = {
  aircraft: "Aircraft",
  crew_training: "Crew",
  base_hangar: "Base",
  utilization_costs: "Util. & Costs",
  financing_fees: "Finance",
  revenue: "Revenue",
};

export const SETUP_ASSUMPTION_KEYS = [
  "aircraft_master_id",
  "home_airport_icao",
  "proposed_home_base",
  "usage_type",
  "operating_model",
] as const;

export function getAllTabAssumptionFields(): WorkspaceField[] {
  return AIRCRAFT_TAB_ORDER.filter((t) => t !== "pro_forma").flatMap(
    (tab) => AIRCRAFT_TAB_FIELDS[tab as Exclude<AircraftWorkspaceTab, "pro_forma">]
  );
}

export function sectionsForTab(
  tab: Exclude<AircraftWorkspaceTab, "pro_forma">
): AircraftTabSection[] {
  return AIRCRAFT_TAB_SECTIONS[tab];
}

export function insuranceFieldActive(
  mode: string | undefined,
  fieldName: "insurance_annual" | "insurance_premium_percent"
): boolean {
  const m = mode === "percent_hull" ? "percent_hull" : "annual";
  if (fieldName === "insurance_annual") return m === "annual";
  return m === "percent_hull";
}
