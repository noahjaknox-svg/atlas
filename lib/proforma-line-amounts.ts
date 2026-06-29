import type { AssumptionMap } from "@/lib/assumptions";
import { buildProFormaStatement } from "@/lib/proforma-statement";

/** Pro forma P&L line keys (workspace statement rows). */
export type ProformaLineKey = string;

/** Annual amounts keyed by pro forma line `key` (positive = magnitude for display). */
export function proFormaLineAmounts(effective: AssumptionMap): Map<string, number> {
  const { rows } = buildProFormaStatement(effective);
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === "line" && row.annual != null) {
      map.set(row.key, Math.abs(row.annual));
    }
    if (row.kind === "subtotal" && row.annual != null) {
      map.set(row.key, Math.abs(row.annual));
    }
  }
  return map;
}

export function proFormaLineAmount(
  effective: AssumptionMap,
  lineKey: ProformaLineKey
): number | null {
  const map = proFormaLineAmounts(effective);
  const v = map.get(lineKey);
  return v != null ? v : null;
}

/** Rate column from a pro forma line (revenue / hourly variable rows). */
export function proFormaLineRate(
  effective: AssumptionMap,
  lineKey: ProformaLineKey
): number | null {
  const { rows } = buildProFormaStatement(effective);
  const row = rows.find((r) => r.key === lineKey && r.kind === "line");
  if (!row || row.rate == null || !Number.isFinite(row.rate) || row.rate <= 0) {
    return null;
  }
  return row.rate;
}
