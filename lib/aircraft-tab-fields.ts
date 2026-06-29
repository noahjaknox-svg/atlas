import type { WorkspaceField } from "@/lib/workspace-sections";
import { FINANCING_SCENARIO_MODE_OPTIONS } from "@/lib/financing-scenario";
import {
  FET_FUEL_TAX_REFUND_LABEL,
  FET_FUEL_TAX_REFUND_RATE_LABEL,
} from "@/lib/fet-refund";
import {
  YES_NO_OPTIONS,
  FET_TREATMENT_OPTIONS,
  FUEL_SOURCE_OPTIONS,
  INSURANCE_MODE_OPTIONS,
} from "@/lib/aircraft-constants";

export type AircraftWorkspaceTab =
  | "aircraft"
  | "owners"
  | "crew_training"
  | "utilization_costs"
  | "financing_fees"
  | "financing"
  | "revenue"
  | "pro_forma";

export type SectionProFormaRollup = {
  label: string;
  type:
    | "sum"
    | "calculated"
    | "proforma"
    | "line"
    | "lineRate"
    | "lineRates"
    | "lines"
    | "hourly"
    | "value";
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
  /** Hide dollar/hour footers on this section (e.g. crew tab inputs only). */
  hideProFormaRollup?: boolean;
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
    ...(calculated ? { readOnly: true } : {}),
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

/** Pro forma line rate column — configurator footers show $/hr; Demo Pro Forma applies hours. */
function rateLineRollup(label: string, proformaLine: string): SectionProFormaRollup {
  return { label, type: "lineRate", proformaLine };
}

/** Currency / large-value assumption field. */
function currency(
  name: string,
  label: string,
  opts?: Partial<WorkspaceField> & { calculated?: boolean }
): WorkspaceField {
  return field(name, label, { type: "currency", ...opts });
}

/** Sum hourly rate fields for workspace footer (P&L applies hours separately). */
function hourlyRateRollup(label: string, rateKey: string): SectionProFormaRollup {
  return {
    label,
    type: "hourly",
    sumKeys: [rateKey],
    format: "currency",
  };
}

const MAINTENANCE_HOURLY_RATE_KEYS = [
  "parts_program_rate",
  "engine_program_rate",
  "apu_program_rate",
  "airframe_program_rate",
  "inspection_reserve_rate",
  "maintenance_reserve_rate",
] as const;

const OPERATING_HOURLY_RATE_KEYS = [
  "fuel_cost_per_hour",
  ...MAINTENANCE_HOURLY_RATE_KEYS,
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
            field("aircraft_profile_mode", "Aircraft type", {
              type: "select",
              required: true,
              options: [
                { value: "existing", label: "Use Existing Aircraft" },
                { value: "general", label: "Use General Aircraft" },
              ],
            }),
            field("tail_number", "Tail number", { required: true, profileMode: "existing" }),
            field("aircraft_year", "Year", {
              type: "number",
              required: true,
              profileMode: "existing",
            }),
            field("aircraft_manufacturer", "Manufacturer", {
              required: true,
              profileMode: "general",
            }),
            field("aircraft_model", "Model", { required: true, profileMode: "general" }),
            field("model_code", "Model code", { profileMode: "general", reference: true }),
            field("aircraft_category", "Category", {
              type: "select",
              profileMode: "general",
              reference: true,
              options: [
                { value: "light_jet", label: "Light jet" },
                { value: "midsize_jet", label: "Midsize jet" },
                { value: "super_midsize_jet", label: "Super midsize jet" },
                { value: "large_cabin_jet", label: "Large cabin jet" },
                { value: "ultra_long_range_jet", label: "Ultra long range" },
                { value: "turboprop", label: "Turboprop" },
                { value: "piston", label: "Piston" },
                { value: "helicopter", label: "Helicopter" },
                { value: "other", label: "Other" },
              ],
            }),
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
            field("range_at_max_passengers", "Range at max passengers", {
              type: "number",
              reference: true,
            }),
            field("typical_cruise_speed", "Typical cruise speed", { type: "number" }),
            field("wifi_features", "Wi-Fi / features"),
          ],
        },
      ],
    },
    {
      title: "Utilization",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Charter ratio",
          fields: [
            field("charter_block_to_flight_ratio", "Block-to-Flight Factor", {
              type: "number",
            }),
          ],
        },
      ],
    },
  ],
  owners: [],
  crew_training: [
    {
      title: "Crew Settings",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Default minimum pilots",
          fields: [
            field("default_minimum_crew", "Default minimum pilots", {
              type: "number",
            }),
            field("crew_count", "Crew count (reference)", {
              type: "number",
              reference: true,
            }),
          ],
        },
        {
          title: "Lead pilot",
          fields: [
            field("lead_pilot_enabled", "Include lead pilot", {
              type: "select",
              options: YES_NO_OPTIONS,
            }),
          ],
        },
        {
          title: "Benefits",
          fields: [field("benefits_pct", "Benefits percentage", { type: "number" })],
        },
      ],
    },
    {
      title: "Pilot Salaries",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Salaries",
          fields: [
            currency("lead_pilot_salary", "Lead pilot salary (annual)"),
            currency("pic_salary", "PIC salary (annual, per pilot)"),
            currency("sic_salary", "SIC salary (annual, per pilot)"),
          ],
        },
      ],
    },
    {
      title: "Pilot Training",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Lead pilot training",
          fields: [currency("lead_pilot_training", "Lead pilot training (annual)")],
        },
        {
          title: "PIC training",
          fields: [currency("pic_training", "PIC training (annual, per pilot)")],
        },
        {
          title: "SIC training",
          fields: [currency("sic_training", "SIC training (annual, per pilot)")],
        },
      ],
    },
    {
      title: "Cabin Attendant",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Cabin",
          fields: [
            field("cabin_attendant_count", "Cabin attendant count", { type: "number" }),
            currency("cabin_attendant_annual_cost", "Cabin attendant annual cost"),
          ],
        },
      ],
    },
  ],
  utilization_costs: [
    {
      title: "Fuel",
      groups: [
        {
          title: "Fuel inputs",
          fields: [
            currency("home_fuel_price", "Home fuel ($/gal)", { required: true }),
            currency("away_fuel_price", "Away fuel ($/gal)", { required: true }),
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
        },
      ],
      proFormaRollup: {
        label: "Fuel",
        type: "hourly",
        sumKeys: ["fuel_cost_per_hour"],
        format: "currency",
      },
    },
    {
      title: "Hourly Maintenance",
      groups: [
        {
          title: "Parts Programs",
          fields: [currency("parts_program_rate", "Parts program hourly rate")],
        },
        {
          title: "Engine Programs",
          fields: [currency("engine_program_rate", "Engine program hourly rate")],
        },
        {
          title: "APU Programs",
          fields: [currency("apu_program_rate", "APU program hourly rate")],
        },
        {
          title: "Airframe Programs",
          fields: [currency("airframe_program_rate", "Airframe program hourly rate")],
        },
        {
          title: "Inspection Reserve",
          fields: [currency("inspection_reserve_rate", "Inspection reserve hourly rate")],
        },
        {
          title: "Maintenance Reserve",
          fields: [currency("maintenance_reserve_rate", "Maintenance reserve hourly rate")],
        },
      ],
      proFormaRollup: {
        label: "Hourly maintenance",
        type: "hourly",
        sumKeys: [...MAINTENANCE_HOURLY_RATE_KEYS],
        format: "currency",
      },
    },
    {
      title: "Hourly Miscellaneous",
      groups: [
        {
          title: "Owner trip expense",
          fields: [currency("trip_expense_per_hour", "Trip expense hourly rate (owner)")],
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
        label: "Hourly miscellaneous",
        type: "hourly",
        sumKeys: ["trip_expense_per_hour"],
        format: "currency",
      },
    },
    {
      title: "Pilot Charter Incentive",
      charterOnly: true,
      groups: [
        {
          title: "Pilot charter incentive",
          charterOnly: true,
          fields: [
            currency("pilot_charter_incentive_per_hour", "Pilot charter incentive (Per Charter Hour)", {
              charterOnly: true,
            }),
          ],
        },
      ],
      proFormaRollup: hourlyRateRollup(
        "Pilot charter incentive (Per Charter Hour)",
        "pilot_charter_incentive_per_hour"
      ),
    },
  ],
  revenue: [
    {
      title: "Charter Revenue",
      charterOnly: true,
      groups: [
        {
          title: "Charter rate",
          charterOnly: true,
          fields: [
            currency("charter_rate", "Charter rate ($/block hr)", { charterOnly: true }),
            field("charter_payback_pct", "Charter payback %", {
              type: "number",
              charterOnly: true,
            }),
            field("charter_payback_basis", "Charter payback basis", {
              type: "select",
              charterOnly: true,
              options: [
                { value: "block_time", label: "Block time" },
                { value: "flight_time", label: "Flight time" },
              ],
            }),
          ],
        },
      ],
      proFormaRollup: rateLineRollup("Charter rate (effective)", "charter_revenue_block"),
    },
    {
      title: "Fuel Surcharge",
      charterOnly: true,
      groups: [
        {
          title: "Fuel surcharge",
          charterOnly: true,
          fields: [
            currency("fuel_surcharge", "Fuel surcharge ($/flight hr)", { charterOnly: true }),
            field("fuel_surcharge_payback_basis", "Fuel surcharge payback basis", {
              type: "select",
              charterOnly: true,
              options: [
                { value: "block_time", label: "Block time" },
                { value: "flight_time", label: "Flight time" },
              ],
            }),
          ],
        },
      ],
      proFormaRollup: rateLineRollup("Fuel surcharge", "fuel_surcharge"),
    },
    {
      title: FET_FUEL_TAX_REFUND_LABEL,
      charterOnly: true,
      groups: [
        {
          title: "Rate",
          charterOnly: true,
          fields: [
            currency("jet_fuel_tax_differential_per_gal", FET_FUEL_TAX_REFUND_RATE_LABEL, {
              charterOnly: true,
            }),
            field("fet_treatment", "FET refund treatment", {
              type: "select",
              options: FET_TREATMENT_OPTIONS,
              charterOnly: true,
            }),
          ],
        },
      ],
      proFormaRollup: rateLineRollup(FET_FUEL_TAX_REFUND_LABEL, "fet_refund"),
    },
  ],
  financing_fees: [
    {
      title: "Hangar",
      groups: [
        {
          title: "Hangar cost",
          fields: [
            field("square_footage", "Square footage", {
              type: "number",
              reference: true,
            }),
            field("hangar_cost_per_sqft", "Hangar cost ($/sqft/yr)", {
              type: "number",
              reference: true,
            }),
            currency("hangar_calculated_annual", "Calculated annual hangar", {
              calculated: true,
            }),
            currency("hangar_annual", "Annual hangar override"),
          ],
          proFormaRollup: lineRollup("Hangar", "hangar_pl"),
        },
      ],
    },
    {
      title: "Insurance",
      groups: [
        {
          title: "Insurance (Hull & Liability)",
          fields: [
            field("insurance_mode", "Insurance input mode", {
              type: "select",
              options: INSURANCE_MODE_OPTIONS,
            }),
            currency("insurance_annual", "Insurance annual"),
            field("insurance_premium_percent", "Insurance percent of hull", { type: "number" }),
          ],
          proFormaRollup: lineRollup("Insurance (Hull & Liability)", "insurance_pl"),
        },
      ],
    },
    {
      title: "Registration and taxes",
      groups: [
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
      ],
    },
    {
      title: "Other Fixed Costs",
      groups: [
        {
          title: "Management Fee",
          fields: [currency("management_fee", "Management fee (annual)")],
          proFormaRollup: lineRollup("Management Fee", "management_fee_pl"),
        },
        {
          title: "Maintenance Management Fee",
          fields: [
            currency("maintenance_management_fee", "Maintenance management fee (annual)"),
          ],
          proFormaRollup: lineRollup(
            "Maintenance Management Fee",
            "maint_mgmt_fee_pl"
          ),
        },
        {
          title: "In-Flight Wi-Fi",
          fields: [currency("wifi_annual", "In-flight Wi-Fi (annual)")],
          proFormaRollup: lineRollup("In-Flight Wi-Fi", "wifi_pl"),
        },
        {
          title: "Subscriptions",
          fields: [currency("subscriptions_annual", "Subscriptions (annual)")],
          proFormaRollup: lineRollup("Subscriptions", "subscriptions_pl"),
        },
        {
          title: "Cleaning",
          fields: [currency("cleaning_annual", "Cleaning (annual)")],
          proFormaRollup: lineRollup("Cleaning", "cleaning_pl"),
        },
        {
          title: "Supplies",
          fields: [currency("supplies_annual", "Supplies (annual)")],
          proFormaRollup: lineRollup("Supplies", "supplies_pl"),
        },
        {
          title: "Airport Fees",
          fields: [currency("airport_fees_annual", "Airport fees (annual)")],
          proFormaRollup: lineRollup("Airport Fees", "airport_fees_pl"),
        },
      ],
    },
  ],
  financing: [
    {
      title: "Pro forma presentation",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Client financing",
          fields: [
            field("financing_scenario_mode", "Financing on pro forma", {
              type: "select",
              options: [...FINANCING_SCENARIO_MODE_OPTIONS],
            }),
          ],
        },
      ],
    },
    {
      title: "Aircraft value",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Hull value",
          fields: [currency("aircraft_value", "Estimated aircraft value")],
        },
      ],
    },
    {
      title: "Financing template",
      hideProFormaRollup: true,
      groups: [
        {
          title: "Loan defaults",
          fields: [
            field("down_payment_percent", "Down payment (%)", { type: "number" }),
            field("interest_rate", "Interest rate (%)", { type: "number" }),
            field("term_months", "Term (months)", { type: "number" }),
            currency("balloon_payment", "Balloon payment ($)"),
          ],
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
  "owners",
  "crew_training",
  "utilization_costs",
  "financing_fees",
  "financing",
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
  owners: "Owners & Hours",
  crew_training: "Crew & Training",
  utilization_costs: "Hourly Costs",
  financing_fees: "Fixed Costs",
  financing: "Financing",
  revenue: "Revenue",
  pro_forma: "Demo Pro Forma",
};

/** Shorter labels for the configurator tab strip (full name in `title`). */
export const TAB_STRIP_LABELS: Record<
  Exclude<AircraftWorkspaceTab, "pro_forma">,
  string
> = {
  aircraft: "Aircraft",
  owners: "Owners",
  crew_training: "Crew",
  utilization_costs: "Hourly Costs",
  financing_fees: "Fixed Costs",
  financing: "Financing",
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
