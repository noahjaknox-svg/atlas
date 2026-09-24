import { ROUTES } from "@/lib/routes";

export const DATA_HUB_FILTER_KEYS = [
  "q",
  "airportIcao",
  "category",
] as const;

export type DataHubFilterKey = (typeof DATA_HUB_FILTER_KEYS)[number];

export type DataHubFilters = Partial<Record<DataHubFilterKey, string>>;

export function parseDataHubFilters(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): DataHubFilters {
  const out: DataHubFilters = {};
  for (const key of DATA_HUB_FILTER_KEYS) {
    const v = searchParams.get(key)?.trim();
    if (v) out[key] = v;
  }
  return out;
}

export function buildDataHubQuery(filters: DataHubFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value?.trim()) params.set(key, value.trim());
  }
  return params;
}

export function hasActiveFilters(filters: DataHubFilters): boolean {
  return Object.values(filters).some((v) => v?.trim());
}

export function clearDataHubFilters(tab: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("tab", tab);
  return params;
}

export type FilterFieldType = "text" | "select" | "searchable";

export type FilterField = {
  key: DataHubFilterKey;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  searchKind?: "aircraft" | "airport" | "fbo";
};

/**
 * Update the Data Hub URL without a server round-trip. `router.replace` re-renders the
 * whole page on the server (auth + DB prefetch) on every tab/row click; Next 14.1+ keeps
 * `useSearchParams` in sync with `history.replaceState`, so this is all we need.
 */
export function replaceDataHubUrl(params: URLSearchParams): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", `${ROUTES.dataWarehouse.data}?${params.toString()}`);
}
