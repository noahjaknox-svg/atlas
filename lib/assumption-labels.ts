import { formatCurrency } from "@/lib/utils";

/** Human-readable labels for scenario template / assumption keys. */
export const ASSUMPTION_KEY_LABELS: Record<string, string> = {
  pic_salary: "PIC salary",
  sic_salary: "SIC salary",
  management_fee: "Management fee",
  owner_annual_hours: "Owner annual hours",
  ownership_percent: "Ownership %",
  proposed_home_base: "Home base",
  crew_model: "Crew model",
  pic_count: "PIC count",
  sic_count: "SIC count",
  financing_enabled: "Financing enabled",
  operator_notes: "Operator notes",
};

export function assumptionKeyLabel(key: string): string {
  return ASSUMPTION_KEY_LABELS[key] ?? key.replace(/_/g, " ");
}

const MONEY_KEYS = new Set([
  "pic_salary",
  "sic_salary",
  "management_fee",
  "insurance_annual",
  "crew_total",
]);

export function formatAssumptionValue(key: string, value: string): string {
  const n = parseFloat(value);
  if (MONEY_KEYS.has(key) && Number.isFinite(n)) {
    return formatCurrency(n);
  }
  return value;
}

export function formatAssumptionsSummary(
  assumptions: Array<{ assumptionKey: string; value: string }> | undefined
): string {
  if (!assumptions?.length) return "—";
  return assumptions
    .map(
      (a) =>
        `${assumptionKeyLabel(a.assumptionKey)}: ${formatAssumptionValue(a.assumptionKey, a.value)}`
    )
    .join(" · ");
}
