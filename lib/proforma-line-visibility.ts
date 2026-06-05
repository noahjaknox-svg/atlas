import type { AssumptionMap } from "@/lib/assumptions";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import { isCharterUsageEnabled } from "@/lib/usage-type";

/** Persisted on proposal assumptions (per aircraft category). */
export const PROFORMA_VISIBILITY_KEY = "proforma_line_visibility";

/** Line-item keys that support show/hide (toggleable statement lines). */
export const PROFORMA_TOGGLEABLE_KEYS = [
  "charter_revenue_block",
  "fuel_surcharge",
  "fet_refund",
  "crew_salaries",
  "crew_training_pl",
  "pilot_charter_incentive_pl",
  "management_fee_pl",
  "maint_mgmt_fee_pl",
  "hangar_pl",
  "registration_pl",
  "insurance_pl",
  "wifi_pl",
  "subscriptions_pl",
  "cleaning_pl",
  "supplies_pl",
  "airport_fees_pl",
  "charter_fuel",
  "charter_parts",
  "charter_engine",
  "charter_apu",
  "charter_airframe",
  "charter_inspection",
  "charter_maintenance",
  "owner_fuel",
  "owner_parts",
  "owner_engine",
  "owner_apu",
  "owner_airframe",
  "owner_inspection",
  "owner_maintenance",
  "owner_trip",
] as const;

export type ProFormaToggleableKey = (typeof PROFORMA_TOGGLEABLE_KEYS)[number];

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

export function isProFormaLineVisible(
  key: string,
  visibility: Record<string, boolean>
): boolean {
  if (visibility[key] === false) return false;
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

  const lineAmounts = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === "line" && row.toggleable) {
      const raw = lineAmount(row);
      const amt =
        row.sign === "revenue" && row.key !== "fet_refund" ? Math.abs(raw) : raw;
      lineAmounts.set(row.key, amt);
    }
  }

  const sumKeys = (keys: string[]) =>
    keys.filter(visible).reduce((s, k) => s + (lineAmounts.get(k) ?? 0), 0);

  const revenueKeys = ["charter_revenue_block", "fuel_surcharge", "fet_refund"];
  const fixedKeys = [
    "crew_salaries",
    "crew_training_pl",
    "pilot_charter_incentive_pl",
    "management_fee_pl",
    "maint_mgmt_fee_pl",
    "hangar_pl",
    "registration_pl",
    "insurance_pl",
    "wifi_pl",
    "subscriptions_pl",
    "cleaning_pl",
    "supplies_pl",
    "airport_fees_pl",
  ];
  const charterKeys = [
    "charter_fuel",
    "charter_parts",
    "charter_engine",
    "charter_apu",
    "charter_airframe",
    "charter_inspection",
    "charter_maintenance",
  ];
  const ownerKeys = [
    "owner_fuel",
    "owner_parts",
    "owner_engine",
    "owner_apu",
    "owner_airframe",
    "owner_inspection",
    "owner_maintenance",
    "owner_trip",
  ];

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
