import type { AssumptionMap } from "@/lib/assumptions";
import { parseFormattedNumber } from "@/lib/utils";

/** Persisted JSON array on proposal assumptions (per aircraft category). */
export const PROFORMA_CUSTOM_FIXED_COSTS_KEY = "proforma_custom_fixed_costs";

export type ProformaCustomFixedCostItem = {
  id: string;
  name: string;
  amount: number;
};

export function customFixedCostLineKey(id: string): string {
  return `custom_fixed_${id}`;
}

export function parseProformaCustomFixedCostsStored(
  assumptions: AssumptionMap
): ProformaCustomFixedCostItem[] {
  const raw = assumptions[PROFORMA_CUSTOM_FIXED_COSTS_KEY];
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ProformaCustomFixedCostItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id) continue;
      const name = typeof item.name === "string" ? item.name : "";
      const amountRaw = item.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : parseFloat(parseFormattedNumber(String(amountRaw ?? "")));
      out.push({
        id,
        name,
        amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseProformaCustomFixedCosts(
  assumptions: AssumptionMap
): ProformaCustomFixedCostItem[] {
  return parseProformaCustomFixedCostsStored(assumptions).filter(
    (item) => item.name.trim().length > 0 && item.amount > 0
  );
}

export function serializeProformaCustomFixedCosts(
  items: ProformaCustomFixedCostItem[]
): string {
  const normalized = items
    .filter((item) => item.id.trim())
    .map((item) => ({
      id: item.id.trim(),
      name: item.name,
      amount: Number.isFinite(item.amount) ? Math.abs(item.amount) : 0,
    }));
  return JSON.stringify(normalized);
}

export function sumProformaCustomFixedCosts(items: ProformaCustomFixedCostItem[]): number {
  return parseProformaCustomFixedCosts({
    [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts(items),
  }).reduce((s, item) => s + item.amount, 0);
}

export function customFixedCostLineKeys(assumptions: AssumptionMap): string[] {
  return parseProformaCustomFixedCosts(assumptions).map((item) =>
    customFixedCostLineKey(item.id)
  );
}

export function createProformaCustomFixedCostId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeProformaCustomFixedCostItems(
  items: ProformaCustomFixedCostItem[]
): ProformaCustomFixedCostItem[] {
  return parseProformaCustomFixedCosts({
    [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts(items),
  });
}

/** Drop blank draft rows — keep only lines with a name and amount for portal/persist. */
export function normalizeProformaCustomFixedCostsAssumption(
  assumptions: AssumptionMap
): AssumptionMap {
  const raw = assumptions[PROFORMA_CUSTOM_FIXED_COSTS_KEY];
  if (!raw?.trim()) return assumptions;
  return {
    ...assumptions,
    [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts(
      parseProformaCustomFixedCosts(assumptions)
    ),
  };
}

export function normalizeCustomFixedCostsInStringMap(
  map: Record<string, string>
): Record<string, string> {
  const raw = map[PROFORMA_CUSTOM_FIXED_COSTS_KEY];
  if (!raw?.trim()) return map;
  return {
    ...map,
    [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts(
      parseProformaCustomFixedCosts({ [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: raw })
    ),
  };
}

export function countCustomFixedCostRows(assumptions: AssumptionMap): {
  stored: number;
  parsed: number;
} {
  return {
    stored: parseProformaCustomFixedCostsStored(assumptions).length,
    parsed: parseProformaCustomFixedCosts(assumptions).length,
  };
}