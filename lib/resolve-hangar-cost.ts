import type { HangarCost, AircraftMaster } from "@prisma/client";

export type HangarCostInput = Pick<
  HangarCost,
  | "quotedAnnual"
  | "ratePerSqftAnnual"
  | "monthlyCostBase"
  | "pricingMethod"
>;

export type ResolvedHangarCost = {
  hangar_monthly: string;
  hangar_annual: string;
  hangar_source: string;
};

/** Resolve monthly hangar from a single hangar cost row + aircraft sqft. */
export function resolveHangarFromRow(
  row: HangarCostInput | null | undefined,
  cabinSqft: number | null | undefined
): { monthly: number; method: string } | null {
  if (!row) return null;

  if (row.quotedAnnual != null && Number(row.quotedAnnual) > 0) {
    const monthly = Math.round(Number(row.quotedAnnual) / 12);
    return { monthly, method: row.pricingMethod === "sqft_rate" ? "sqft_rate" : "quoted" };
  }

  if (
    row.ratePerSqftAnnual != null &&
    Number(row.ratePerSqftAnnual) > 0 &&
    cabinSqft != null &&
    cabinSqft > 0
  ) {
    const annual = Number(row.ratePerSqftAnnual) * cabinSqft;
    return { monthly: Math.round(annual / 12), method: "sqft_rate" };
  }

  if (row.monthlyCostBase != null && Number(row.monthlyCostBase) > 0) {
    return { monthly: Math.round(Number(row.monthlyCostBase)), method: "category_estimate" };
  }

  return null;
}

export function toHangarAssumptions(
  monthly: number,
  source = "data_hub"
): ResolvedHangarCost {
  const annual = monthly * 12;
  return {
    hangar_monthly: String(monthly),
    hangar_annual: String(annual),
    hangar_source: source,
  };
}

export type HangarLookupParams = {
  hangarRows: HangarCostInput[];
  cabinSqft: number | null | undefined;
};

/** Priority: aircraft-specific quoted/sqft rows, then category monthly fallback. */
export function pickBestHangarRow(rows: HangarCostInput[]): HangarCostInput | null {
  if (!rows.length) return null;

  const withQuote = rows.find((r) => r.quotedAnnual != null && Number(r.quotedAnnual) > 0);
  if (withQuote) return withQuote;

  const withSqft = rows.find(
    (r) => r.ratePerSqftAnnual != null && Number(r.ratePerSqftAnnual) > 0
  );
  if (withSqft) return withSqft;

  const withMonthly = rows.find(
    (r) => r.monthlyCostBase != null && Number(r.monthlyCostBase) > 0
  );
  return withMonthly ?? rows[0];
}

export function resolveHangarCostFromRows(
  params: HangarLookupParams
): ResolvedHangarCost | null {
  const row = pickBestHangarRow(params.hangarRows);
  const resolved = resolveHangarFromRow(row, params.cabinSqft);
  if (!resolved) return null;
  return toHangarAssumptions(resolved.monthly);
}

export type AircraftWithSqft = Pick<AircraftMaster, "cabinSqft" | "aircraftCategory">;
