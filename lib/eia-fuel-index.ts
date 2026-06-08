/**
 * Fetch latest US kerosene-type jet fuel price from EIA Open Data API v2.
 * @see https://www.eia.gov/opendata/documentation.php
 */
export async function fetchEiaJetFuelIndex(apiKey: string): Promise<{
  pricePerGallon: number;
  effectiveDate: string;
  sourceUrl: string;
} | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "weekly",
    "data[0]": "value",
    "facets[product][]": "EPJK",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "1",
  });

  const sourceUrl = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?${params.toString()}`;
  const res = await fetch(sourceUrl, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    response?: { data?: Array<{ period?: string; value?: string | number }> };
  };

  const row = json.response?.data?.[0];
  if (!row?.period || row.value == null) return null;

  const price = typeof row.value === "number" ? row.value : parseFloat(String(row.value));
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    pricePerGallon: price,
    effectiveDate: row.period,
    sourceUrl,
  };
}

/** Markups applied to EIA index for FBO retail / contract when prices are blank. */
export const FBO_RETAIL_MARKUP = 1.35;
export const FBO_CONTRACT_MARKUP = 1.12;
