import type { AssumptionMap } from "@/lib/assumptions";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import { DEFAULT_LINE_CATALOG, lineRowKeys } from "@/lib/line-item-catalog";
import { isCharterUsageEnabled } from "@/lib/usage-type";

/** Persisted on proposal assumptions (per aircraft category). */
export const PROFORMA_VISIBILITY_KEY = "proforma_line_visibility";

/** Built-in line-item row keys that support show/hide (custom catalog lines add their own). */
export const PROFORMA_TOGGLEABLE_KEYS: string[] = DEFAULT_LINE_CATALOG.flatMap(lineRowKeys);

export function parseProFormaVisibility(assumptions: AssumptionMap): Record<string, boolean> {
  const raw = assumptions[PROFORMA_VISIBILITY_KEY];
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Visibility entry covering every custom fixed cost line (`custom_fixed_<id>`). */
export const CUSTOM_FIXED_WILDCARD = "custom_fixed_*";

export function isProFormaLineVisible(
  key: string,
  visibility: Record<string, boolean>
): boolean {
  if (visibility[key] === false) return false;
  if (visibility[key] === true) return true;
  if (key.startsWith("custom_fixed_") && visibility[CUSTOM_FIXED_WILDCARD] === false) return false;
  return true;
}

export function serializeProFormaVisibility(
  visibility: Record<string, boolean>
): string {
  return JSON.stringify(visibility);
}

export function setProFormaLineVisible(
  visibility: Record<string, boolean>,
  key: string,
  visible: boolean
): string {
  const next = { ...visibility, [key]: visible };
  return serializeProFormaVisibility(next);
}

type StatementGroup = "revenue" | "fixed" | "charter" | "owner";

/** Statement section headings (lib/proforma-statement.ts) → roll-up group. */
const SECTION_GROUPS: Record<string, StatementGroup> = {
  Revenue: "revenue",
  "Fixed Ownership Costs": "fixed",
  "Charter Variable Costs": "charter",
  "Owner Variable Costs": "owner",
};

function lineAmount(row: ProFormaStatementRow): number {
  return row.annual ?? 0;
}

/** Recompute roll-up rows from visible line items only. */
export function applyProFormaVisibility(
  rows: ProFormaStatementRow[],
  visibility: Record<string, boolean>,
  ownerAnnualHours = 0,
  assumptions?: AssumptionMap
): ProFormaStatementRow[] {
  const charterEnabled = assumptions ? isCharterUsageEnabled(assumptions) : true;
  const visible = (key: string) => isProFormaLineVisible(key, visibility);

  // Each toggleable line's group comes from the statement section it sits under, so
  // catalog lines (including custom ones) roll up without hardcoded key lists.
  const lineAmounts = new Map<string, number>();
  const groupKeys: Record<StatementGroup, string[]> = { revenue: [], fixed: [], charter: [], owner: [] };
  let group: StatementGroup | null = null;
  for (const row of rows) {
    if (row.kind === "section") {
      group = SECTION_GROUPS[row.label] ?? null;
      continue;
    }
    if (row.kind === "line" && row.toggleable) {
      const raw = lineAmount(row);
      const amt =
        row.sign === "revenue" && row.key !== "fet_refund" ? Math.abs(raw) : raw;
      lineAmounts.set(row.key, amt);
      if (group) groupKeys[group].push(row.key);
    }
  }

  const sumKeys = (keys: string[]) =>
    keys.filter(visible).reduce((s, k) => s + (lineAmounts.get(k) ?? 0), 0);

  const revenueKeys = groupKeys.revenue;
  const fixedKeys = groupKeys.fixed;
  const charterKeys = groupKeys.charter;
  const ownerKeys = groupKeys.owner;

  const totalRevenue = charterEnabled ? sumKeys(revenueKeys) : 0;
  const totalFixed = sumKeys(fixedKeys);
  const totalCharterVar = charterEnabled ? sumKeys(charterKeys) : 0;
  const totalOwnerVar = sumKeys(ownerKeys);

  const netBeforeOwner = charterEnabled
    ? totalRevenue + totalFixed + totalCharterVar
    : totalFixed + totalOwnerVar;
  const netAnnualOwner = netBeforeOwner + totalOwnerVar;

  const costPerOwnerHour =
    ownerAnnualHours > 0 ? Math.abs(netAnnualOwner) / ownerAnnualHours : 0;

  const rollup: Record<string, number> = {
    total_revenue: totalRevenue,
    total_fixed_ownership: totalFixed,
    total_charter_variable: totalCharterVar,
    total_owner_variable: totalOwnerVar,
    bridge_total_revenue: totalRevenue,
    bridge_fixed: totalFixed,
    bridge_charter_var: totalCharterVar,
    bridge_net_before_owner: netBeforeOwner,
    net_operating_pl: netBeforeOwner,
    bridge_owner_var: totalOwnerVar,
    net_annual_owner: netAnnualOwner,
    net_monthly_owner: netAnnualOwner / 12,
    cost_per_owner_hour: costPerOwnerHour,
    total_net_revenue: totalRevenue,
    total_charter_flight: totalCharterVar,
    total_owner_flight: totalOwnerVar,
  };

  return rows.map((row) => {
    if (row.kind === "line" && row.toggleable && !visible(row.key)) {
      return { ...row, annual: 0, monthly: 0, hidden: true as const };
    }
    if (row.kind === "line" && row.toggleable) {
      return { ...row, hidden: false as const };
    }
    if (row.key in rollup) {
      const annual = rollup[row.key];
      return {
        ...row,
        annual,
        monthly: row.kind === "metric" ? row.monthly : annual / 12,
      };
    }
    return row;
  });
}
