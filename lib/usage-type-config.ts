import type { AssumptionMap } from "@/lib/assumptions";
import { FET_FUEL_TAX_REFUND_LABEL } from "@/lib/fet-refund";
import {
  CUSTOM_FIXED_WILDCARD,
  PROFORMA_VISIBILITY_KEY,
  serializeProFormaVisibility,
} from "@/lib/proforma-line-visibility";

/**
 * Per-usage-type pro forma configuration (Data Warehouse → Usage Types).
 *
 * Each line has two switches:
 * - include:    counts in the math. Feeds the existing `proforma_line_visibility`
 *               assumption, so an excluded line is zeroed and totals recompute.
 * - showClient: itemized on the client portal. Hidden lines still count in totals.
 *
 * Stored as versioned JSON so new switches/lines can be added without migrations:
 * unknown keys are ignored, and lines with no entry fall back to LINE_DEFAULTS.
 */
export type UsageTypeLineSetting = { include: boolean; showClient: boolean };

export type UsageTypeConfig = {
  version: 1;
  /** Show the Revenue section on the client portal (math unaffected). */
  showRevenueSection: boolean;
  lines: Record<string, UsageTypeLineSetting>;
};

export { CUSTOM_FIXED_WILDCARD };

/** Assumptions written onto each aircraft when a usage type is applied. */
export const PROFORMA_CLIENT_HIDDEN_KEY = "proforma_client_hidden";
export const SHOW_REVENUE_SECTION_KEY = "show_revenue_section";

export type UsageTypeLineGroup = {
  id: "revenue" | "fixed" | "charter_variable" | "owner_variable";
  label: string;
  /** Lines in this group only apply when charter is enabled. */
  charterOnly: boolean;
  lines: Array<{ key: string; label: string; charterOnly?: boolean }>;
};

/** Every configurable line, grouped like the pro forma statement (lib/proforma-statement.ts). */
export const USAGE_TYPE_LINE_GROUPS: UsageTypeLineGroup[] = [
  {
    id: "revenue",
    label: "Revenue",
    charterOnly: true,
    lines: [
      { key: "charter_revenue_block", label: "Charter Revenue" },
      { key: "fuel_surcharge", label: "Fuel Surcharge" },
      { key: "fet_refund", label: FET_FUEL_TAX_REFUND_LABEL },
    ],
  },
  {
    id: "fixed",
    label: "Fixed Ownership Costs",
    charterOnly: false,
    lines: [
      { key: "crew_salaries", label: "Crew Salaries & Benefits" },
      { key: "crew_training_pl", label: "Crew Training" },
      { key: "pilot_charter_incentive_pl", label: "Pilot Charter Incentive", charterOnly: true },
      { key: "management_fee_pl", label: "Management Fee" },
      { key: "maint_mgmt_fee_pl", label: "Maintenance Management Fee" },
      { key: "hangar_pl", label: "Hangar" },
      { key: "registration_pl", label: "Registration / Taxes" },
      { key: "insurance_pl", label: "Insurance (Hull & Liability)" },
      { key: "wifi_pl", label: "In-Flight Wi-Fi" },
      { key: "subscriptions_pl", label: "Subscriptions" },
      { key: "cleaning_pl", label: "Cleaning" },
      { key: "supplies_pl", label: "Supplies" },
      { key: "airport_fees_pl", label: "Airport Fees" },
      { key: "financing_debt_pl", label: "Debt service" },
      { key: CUSTOM_FIXED_WILDCARD, label: "Custom fixed costs (all)" },
    ],
  },
  {
    id: "charter_variable",
    label: "Charter Variable Costs",
    charterOnly: true,
    lines: [
      { key: "charter_fuel", label: "Fuel" },
      { key: "charter_parts", label: "Parts Programs" },
      { key: "charter_engine", label: "Engine Programs" },
      { key: "charter_apu", label: "APU Programs" },
      { key: "charter_airframe", label: "Airframe Programs" },
      { key: "charter_inspection", label: "Inspection Reserve" },
      { key: "charter_maintenance", label: "Maintenance Reserve" },
    ],
  },
  {
    id: "owner_variable",
    label: "Owner Variable Costs",
    charterOnly: false,
    lines: [
      { key: "owner_fuel", label: "Fuel" },
      { key: "owner_parts", label: "Parts Programs" },
      { key: "owner_engine", label: "Engine Programs" },
      { key: "owner_apu", label: "APU Programs" },
      { key: "owner_airframe", label: "Airframe Programs" },
      { key: "owner_inspection", label: "Inspection Reserve" },
      { key: "owner_maintenance", label: "Maintenance Reserve" },
      { key: "owner_trip", label: "Owner Trip Expense" },
    ],
  },
];

export const USAGE_TYPE_LINE_KEYS: string[] = USAGE_TYPE_LINE_GROUPS.flatMap((g) =>
  g.lines.map((l) => l.key)
);

/**
 * Defaults for lines without an explicit entry. Insurance and registration start
 * excluded — that matches how new aircraft were seeded before usage-type config.
 */
const LINE_DEFAULTS: Record<string, UsageTypeLineSetting> = {
  insurance_pl: { include: false, showClient: true },
  registration_pl: { include: false, showClient: true },
};
const FALLBACK_LINE: UsageTypeLineSetting = { include: true, showClient: true };

export function defaultLineSetting(key: string): UsageTypeLineSetting {
  return LINE_DEFAULTS[key] ?? FALLBACK_LINE;
}

export function defaultUsageTypeConfig(): UsageTypeConfig {
  return { version: 1, showRevenueSection: true, lines: {} };
}

/** Tolerant parse of the stored JSON (or a request body); never throws. */
export function parseUsageTypeConfig(raw: unknown): UsageTypeConfig {
  const config = defaultUsageTypeConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return config;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.showRevenueSection === "boolean") config.showRevenueSection = obj.showRevenueSection;
  const lines = obj.lines;
  if (lines && typeof lines === "object" && !Array.isArray(lines)) {
    for (const [key, value] of Object.entries(lines as Record<string, unknown>)) {
      if (!USAGE_TYPE_LINE_KEYS.includes(key)) continue; // unknown/retired line
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const base = defaultLineSetting(key);
      config.lines[key] = {
        include: typeof v.include === "boolean" ? v.include : base.include,
        showClient: typeof v.showClient === "boolean" ? v.showClient : base.showClient,
      };
    }
  }
  return config;
}

/** The effective setting for a line (explicit entry, wildcard for custom lines, or default). */
export function lineSetting(config: UsageTypeConfig, key: string): UsageTypeLineSetting {
  if (config.lines[key]) return config.lines[key]!;
  if (key.startsWith("custom_fixed_") && config.lines[CUSTOM_FIXED_WILDCARD]) {
    return config.lines[CUSTOM_FIXED_WILDCARD]!;
  }
  return defaultLineSetting(key);
}

/**
 * Line visibility (include) map for `proforma_line_visibility`. A line is included
 * only if both the aircraft type's warehouse visibility and the usage type allow it.
 */
export function toLineVisibility(
  config: UsageTypeConfig,
  warehouseVisibility: Record<string, boolean> = {}
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of USAGE_TYPE_LINE_KEYS) {
    // The wildcard is stored as-is; isProFormaLineVisible applies it to custom lines.
    out[key] = lineSetting(config, key).include && warehouseVisibility[key] !== false;
  }
  for (const [key, visible] of Object.entries(warehouseVisibility)) {
    if (!(key in out) && visible === false) out[key] = false;
  }
  return out;
}

/** Keys (including the custom wildcard) that count in totals but aren't itemized for clients. */
export function toClientHidden(config: UsageTypeConfig): string[] {
  return USAGE_TYPE_LINE_KEYS.filter((key) => {
    const s = lineSetting(config, key);
    return s.include && !s.showClient;
  });
}

export function parseClientHidden(assumptions: AssumptionMap): string[] {
  const raw = assumptions[PROFORMA_CLIENT_HIDDEN_KEY];
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function isClientHiddenLine(key: string, hidden: readonly string[]): boolean {
  if (hidden.includes(key)) return true;
  return key.startsWith("custom_fixed_") && hidden.includes(CUSTOM_FIXED_WILDCARD);
}

/**
 * Assumptions to write onto an aircraft when this usage type is applied. Resets the
 * aircraft's line settings to the usage type's (staff can re-toggle per proposal after).
 */
export function usageTypeAssumptionPatch(params: {
  config: UsageTypeConfig;
  charterEnabled: boolean;
  warehouseVisibility?: Record<string, boolean>;
}): Record<string, string> {
  return {
    charter_enabled: params.charterEnabled ? "true" : "false",
    [PROFORMA_VISIBILITY_KEY]: serializeProFormaVisibility(
      toLineVisibility(params.config, params.warehouseVisibility)
    ),
    [PROFORMA_CLIENT_HIDDEN_KEY]: JSON.stringify(toClientHidden(params.config)),
    [SHOW_REVENUE_SECTION_KEY]: params.config.showRevenueSection ? "true" : "false",
  };
}
