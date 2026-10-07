import { z } from "zod";

/**
 * Optional per-aircraft-type overrides of company-wide costs (Data Warehouse →
 * Aircraft types → Annual Expenses). Keys are the proposal assumption names, so
 * seeding is a straight merge: proposal edit > type override > company default.
 * A missing key (or blank) means "inherit the company default".
 */
export const COST_OVERRIDE_KEYS = [
  "management_fee",
  "maintenance_management_fee",
  "insurance_mode",
  "insurance_annual",
  "insurance_premium_percent",
  "registration_tax_rate",
] as const;

export type CostOverrideKey = (typeof COST_OVERRIDE_KEYS)[number];
export type CostOverrides = Partial<Record<CostOverrideKey, string>>;

/** Which override keys belong to which line, and how the company default is described. */
export const COST_OVERRIDE_LINES: Array<{
  line: "management_fee" | "maintenance_management_fee" | "insurance" | "registration";
  label: string;
  keys: CostOverrideKey[];
}> = [
  { line: "management_fee", label: "Management Fee", keys: ["management_fee"] },
  { line: "maintenance_management_fee", label: "Maintenance Management Fee", keys: ["maintenance_management_fee"] },
  { line: "insurance", label: "Insurance (Hull & Liability)", keys: ["insurance_mode", "insurance_annual", "insurance_premium_percent"] },
  { line: "registration", label: "Registration / Taxes", keys: ["registration_tax_rate"] },
];

const NUMERIC_KEYS = new Set<CostOverrideKey>([
  "management_fee",
  "maintenance_management_fee",
  "insurance_annual",
  "insurance_premium_percent",
  "registration_tax_rate",
]);

/** Tolerant parse of stored JSON (or a request body): unknown keys and bad values are dropped. */
export function parseCostOverrides(raw: unknown): CostOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: CostOverrides = {};
  for (const key of COST_OVERRIDE_KEYS) {
    const v = src[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    if (key === "insurance_mode") {
      if (s === "annual" || s === "percent_hull") out[key] = s;
      continue;
    }
    const n = Number(s);
    if (NUMERIC_KEYS.has(key) && Number.isFinite(n) && n >= 0) out[key] = String(n);
  }
  return out;
}

export const costOverridesSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.null()]))
  .transform(parseCostOverrides);

/** Empty overrides are stored as null so the column stays clean. */
export function costOverridesForStorage(raw: unknown): CostOverrides | null {
  const parsed = parseCostOverrides(raw);
  return Object.keys(parsed).length > 0 ? parsed : null;
}
