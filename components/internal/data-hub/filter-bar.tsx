"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import {
  buildDataHubQuery,
  clearDataHubFilters,
  hasActiveFilters,
  parseDataHubFilters,
  type DataHubFilterKey,
  type FilterField,
} from "@/lib/data-hub-filters";
import { ROUTES } from "@/lib/routes";

export function DataHubSearchBar({ tab }: { tab: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseDataHubFilters(searchParams);
  const [qLocal, setQLocal] = useState(filters.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQLocal(filters.q ?? "");
  }, [filters.q]);

  const pushQ = useCallback(
    (value: string) => {
      const current = parseDataHubFilters(searchParams);
      const next = { ...current, q: value.trim() || undefined };
      if (!next.q) delete next.q;
      const params = buildDataHubQuery(next);
      params.set("tab", tab);
      router.replace(`${ROUTES.dataWarehouse.data}?${params.toString()}`);
    },
    [router, searchParams, tab]
  );

  function onQChange(value: string) {
    setQLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQ(value), 300);
  }

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atlas-muted" />
      <input
        type="text"
        value={qLocal}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Search records…"
        className="atlas-input h-9 w-full pl-8 text-sm"
      />
    </div>
  );
}

export function DataHubFilterSidebar({
  tab,
  fields,
}: {
  tab: string;
  fields: FilterField[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseDataHubFilters(searchParams);

  const [aircraftOptions, setAircraftOptions] = useState<SearchableOption[]>([]);
  const [airportOptions, setAirportOptions] = useState<SearchableOption[]>([]);
  const [aircraftLabel, setAircraftLabel] = useState("");
  const [airportLabel, setAirportLabel] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const pushFilters = useCallback(
    (patch: Partial<Record<DataHubFilterKey, string | undefined>>) => {
      const current = parseDataHubFilters(searchParams);
      const next = { ...current, ...patch };
      for (const key of Object.keys(patch) as DataHubFilterKey[]) {
        if (!patch[key]?.trim()) delete next[key];
      }
      const params = buildDataHubQuery(next);
      params.set("tab", tab);
      router.replace(`${ROUTES.dataWarehouse.data}?${params.toString()}`);
    },
    [router, searchParams, tab]
  );

  async function searchAircraft(query: string) {
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/aircraft-master/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id: string; label: string }>;
        setAircraftOptions(rows.map((r) => ({ id: r.id, label: r.label })));
      }
    } finally {
      setSearchLoading(false);
    }
  }

  async function searchAirport(query: string) {
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string;
          icao: string;
          airportName: string;
        }>;
        setAirportOptions(
          rows.map((r) => ({
            id: r.id,
            label: `${r.icao} — ${r.airportName}`,
          }))
        );
      }
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (!filters.aircraftId) {
      setAircraftLabel("");
      return;
    }
    void (async () => {
      const res = await fetch(`/api/data/aircraft-master/${filters.aircraftId}`);
      if (!res.ok) return;
      const match = (await res.json()) as { manufacturer: string; model: string };
      setAircraftLabel(`${match.manufacturer} ${match.model}`);
    })();
  }, [filters.aircraftId]);

  useEffect(() => {
    if (!filters.airportId) {
      setAirportLabel("");
      return;
    }
    void (async () => {
      const res = await fetch(`/api/data/airports/${filters.airportId}`);
      if (!res.ok) return;
      const match = (await res.json()) as { icao: string; airportName: string };
      setAirportLabel(`${match.icao} — ${match.airportName}`);
    })();
  }, [filters.airportId]);

  function clearAll() {
    router.replace(`${ROUTES.dataWarehouse.data}?${clearDataHubFilters(tab).toString()}`);
    setAircraftLabel("");
    setAirportLabel("");
  }

  const active = hasActiveFilters(filters);

  if (fields.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-atlas-muted">Filters</p>
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-atlas-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-3">
        {fields.map((f) => {
          if (f.type === "select" && f.options) {
            return (
              <div key={f.key}>
                <label className="atlas-kicker mb-1 block">{f.label}</label>
                <select
                  value={filters[f.key] ?? ""}
                  onChange={(e) =>
                    pushFilters({ [f.key]: e.target.value || undefined })
                  }
                  className="h-9 w-full rounded border border-atlas-border bg-atlas-bg px-2 text-sm"
                >
                  <option value="">All</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.type === "searchable" && f.searchKind === "aircraft") {
            return (
              <div key={f.key}>
                <SearchableSelect
                  compact
                  label={f.label}
                  placeholder="Search aircraft…"
                  value={filters.aircraftId ?? ""}
                  displayValue={aircraftLabel}
                  options={aircraftOptions}
                  loading={searchLoading}
                  onSearch={(q) => void searchAircraft(q)}
                  onSelect={(opt) => {
                    if (opt) {
                      setAircraftLabel(opt.label);
                      pushFilters({ aircraftId: opt.id });
                    } else {
                      setAircraftLabel("");
                      pushFilters({ aircraftId: undefined });
                    }
                  }}
                />
              </div>
            );
          }
          if (f.type === "searchable" && f.searchKind === "airport") {
            return (
              <div key={f.key}>
                <SearchableSelect
                  compact
                  label={f.label}
                  placeholder="Search airport…"
                  value={filters.airportId ?? ""}
                  displayValue={airportLabel}
                  options={airportOptions}
                  loading={searchLoading}
                  onSearch={(q) => void searchAirport(q)}
                  onSelect={(opt) => {
                    if (opt) {
                      setAirportLabel(opt.label);
                      pushFilters({ airportId: opt.id });
                    } else {
                      setAirportLabel("");
                      pushFilters({ airportId: undefined });
                    }
                  }}
                />
              </div>
            );
          }
          if (f.type === "text") {
            return (
              <div key={f.key}>
                <label className="atlas-kicker mb-1 block">{f.label}</label>
                <input
                  type="text"
                  value={filters[f.key] ?? ""}
                  onChange={(e) =>
                    pushFilters({ [f.key]: e.target.value || undefined })
                  }
                  placeholder={f.placeholder}
                  className="atlas-input h-9 w-full"
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
