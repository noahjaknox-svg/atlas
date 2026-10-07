import type { AssumptionMap } from "@/lib/assumptions";
import { DEFAULT_LINE_CATALOG, lineRowKey, type CatalogLineItem } from "@/lib/line-item-catalog";
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

/**
 * Every configurable line, grouped like the pro forma statement, built from the Line
 * Items catalog so custom items get Include / Show client settings automatically.
 */
export function usageTypeLineGroups(
  catalog: readonly CatalogLineItem[] = DEFAULT_LINE_CATALOG
): UsageTypeLineGroup[] {
  const active = catalog.filter((i) => i.active);
  const line = (key: string, item: CatalogLineItem) => ({
    key,
    label: item.label,
    ...(item.charterOnly ? { charterOnly: true } : {}),
  });
  const variable = (bucket: "charter" | "owner") =>
    active
      .filter((i) => i.section === "variable")
      .filter((i) => (i.appliesTo ?? "both") === "both" || i.appliesTo === bucket)
      .map((i) => line(`${bucket}_${i.key}`, i));
  return [
    {
      id: "revenue",
      label: "Revenue",
      charterOnly: true,
      lines: active.filter((i) => i.section === "revenue").map((i) => line(lineRowKey(i), i)),
    },
    {
      id: "fixed",
      label: "Fixed Ownership Costs",
      charterOnly: false,
      lines: [
        ...active.filter((i) => i.section === "fixed").map((i) => line(lineRowKey(i), i)),
        { key: CUSTOM_FIXED_WILDCARD, label: "Per-proposal custom costs (all)" },
      ],
    },
    { id: "charter_variable", label: "Charter Variable Costs", charterOnly: true, lines: variable("charter") },
    { id: "owner_variable", label: "Owner Variable Costs", charterOnly: false, lines: variable("owner") },
  ];
}

/** Built-in groups (no custom catalog items). */
export const USAGE_TYPE_LINE_GROUPS: UsageTypeLineGroup[] = usageTypeLineGroups();

export function usageTypeLineKeys(catalog: readonly CatalogLineItem[] = DEFAULT_LINE_CATALOG): string[] {
  return usageTypeLineGroups(catalog).flatMap((g) => g.lines.map((l) => l.key));
}

export const USAGE_TYPE_LINE_KEYS: string[] = usageTypeLineKeys();

/** Row keys custom catalog items produce: `li_x`, `charter_li_x`, `owner_li_x`. */
const CUSTOM_LINE_ROW_KEY = /^(charter_|owner_)?li_[a-z0-9_]+$/;

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
      if (!USAGE_TYPE_LINE_KEYS.includes(key) && !CUSTOM_LINE_ROW_KEY.test(key)) continue; // unknown/retired
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
  warehouseVisibility: Record<string, boolean> = {},
  catalog: readonly CatalogLineItem[] = DEFAULT_LINE_CATALOG
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of usageTypeLineKeys(catalog)) {
    // The wildcard is stored as-is; isProFormaLineVisible applies it to custom lines.
    out[key] = lineSetting(config, key).include && warehouseVisibility[key] !== false;
  }
  for (const [key, visible] of Object.entries(warehouseVisibility)) {
    if (!(key in out) && visible === false) out[key] = false;
  }
  return out;
}

/** Keys (including the custom wildcard) that count in totals but aren't itemized for clients. */
export function toClientHidden(
  config: UsageTypeConfig,
  catalog: readonly CatalogLineItem[] = DEFAULT_LINE_CATALOG
): string[] {
  return usageTypeLineKeys(catalog).filter((key) => {
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
  catalog?: readonly CatalogLineItem[];
}): Record<string, string> {
  return {
    charter_enabled: params.charterEnabled ? "true" : "false",
    [PROFORMA_VISIBILITY_KEY]: serializeProFormaVisibility(
      toLineVisibility(params.config, params.warehouseVisibility, params.catalog)
    ),
    [PROFORMA_CLIENT_HIDDEN_KEY]: JSON.stringify(toClientHidden(params.config, params.catalog)),
    [SHOW_REVENUE_SECTION_KEY]: params.config.showRevenueSection ? "true" : "false",
  };
}
