"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getAircraftDisplayName, usageTypeToOperatingModel } from "@/lib/aircraft-workspace";
import { applyWarehouseDefaults, warehouseDefaultsBaseline } from "@/lib/warehouse-assumption-seed";
import { buildDefaultsQueryParams } from "@/lib/build-defaults-query";
import type { AssumptionMap } from "@/lib/assumptions";

type MasterRow = {
  id: string;
  label: string;
  manufacturer: string;
  model: string;
};

type FboOption = { id: string; label: string };

export function AircraftSetupBar({
  proposalId,
  aircraftId,
  assumptions,
  onApplyDefaults,
  onWarehouseDefaultsSeeded,
}: {
  proposalId: string;
  aircraftId: string;
  assumptions: AssumptionMap;
  onApplyDefaults: (patch: Partial<AssumptionMap>, instancePatch?: Record<string, unknown>) => void;
  onWarehouseDefaultsSeeded?: (defaults: Record<string, string>) => void;
}) {
  const [masterOptions, setMasterOptions] = useState<{ id: string; label: string }[]>([]);
  const [airportOptions, setAirportOptions] = useState<{ id: string; label: string }[]>([]);
  const [fboOptions, setFboOptions] = useState<FboOption[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [airportLoading, setAirportLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<MasterRow | null>(null);
  const [selectedIcao, setSelectedIcao] = useState(assumptions.home_airport_icao ?? "SDL");
  const [fboName, setFboName] = useState(assumptions.fbo_name ?? "PrismJet");
  const [usageType, setUsageType] = useState(assumptions.usage_type?.trim() || "part_91");
  const [usageTypeOptions, setUsageTypeOptions] = useState<
    { value: string; label: string; charterEnabled: boolean }[]
  >([]);

  const searchMasters = useCallback(async (q: string) => {
    setMasterLoading(true);
    const res = await fetch(`/api/aircraft-master/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setMasterLoading(false);
    if (res.ok) {
      setMasterOptions(json.map((r: MasterRow) => ({ id: r.id, label: r.label })));
    }
  }, []);

  const searchAirports = useCallback(async (q: string) => {
    setAirportLoading(true);
    const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setAirportLoading(false);
    if (res.ok) {
      setAirportOptions(
        json.map((a: { icao: string; label?: string; airportName?: string; city?: string | null }) => ({
          id: a.icao,
          label: a.label ?? `${a.icao} — ${a.airportName ?? ""}${a.city ? `, ${a.city}` : ""}`,
        }))
      );
    }
  }, []);

  const loadFbos = useCallback(async (icao: string) => {
    if (!icao.trim()) {
      setFboOptions([]);
      return;
    }
    const res = await fetch(`/api/airports/${encodeURIComponent(icao.trim())}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFboOptions([]);
      return;
    }
    const fbos = ((json.fbos ?? []) as Array<{ id: string; fboName: string }>).map((f) => ({
      id: f.id,
      label: f.fboName,
    }));
    setFboOptions(fbos);
    if (fbos.some((f) => f.label === fboName)) return;
    const preferred = fbos.find((f) => f.label.toLowerCase() === "prismjet");
    if (preferred) setFboName(preferred.label);
    else if (fbos.length > 0) setFboName(fbos[0]!.label);
  }, [fboName]);

  const loadUsageTypes = useCallback(async () => {
    const res = await fetch("/api/data/usage-types");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const rows = (json.rows ?? []) as { name: string; active: boolean; charterEnabled: boolean }[];
    const options = rows
      .filter((r) => r.active)
      .map((r) => ({ value: r.name, label: r.name, charterEnabled: r.charterEnabled }));
    if (options.length > 0) setUsageTypeOptions(options);
  }, []);

  const applyBundle = useCallback(
    async (master: MasterRow | null, icao: string, fbo: string, usage: string) => {
      setApplying(true);
      try {
        await fetch(`/api/proposals/${proposalId}/aircraft/${aircraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposedHomeBaseIcao: icao || undefined,
            fboName: fbo || undefined,
            aircraftMasterId: master?.id ?? null,
          }),
        });

        const params = buildDefaultsQueryParams({
          ...assumptions,
          home_airport_icao: icao.toUpperCase(),
          proposed_home_base: icao.toUpperCase(),
          fbo_name: fbo,
          usage_type: usage,
          ...(master?.id ? { aircraft_master_id: master.id } : {}),
        });

        const res = await fetch(
          `/api/proposals/${proposalId}/aircraft/${aircraftId}/defaults?${params.toString()}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.defaults) return;

        const defaults = json.defaults as Record<string, string>;
        const baseline = warehouseDefaultsBaseline(defaults);
        const seeded = applyWarehouseDefaults(assumptions, defaults, "seed");
        const charterEnabled = usageTypeOptions.find((o) => o.value === usage)?.charterEnabled;

        onApplyDefaults(
          {
            ...seeded,
            usage_type: usage,
            charter_enabled: charterEnabled == null ? undefined : charterEnabled ? "true" : "false",
            operating_model: usageTypeToOperatingModel(usage, charterEnabled),
            fbo_name: fbo,
            home_airport_icao: icao.toUpperCase(),
            proposed_home_base: icao.toUpperCase(),
            ...(master?.id ? { aircraft_master_id: master.id } : {}),
            hangar_annual: "",
            hangar_monthly: "",
            hangar_pricing_mode: "",
            hangar_source: "",
          },
          {
            proposedHomeBaseIcao: icao || undefined,
            fboName: fbo || undefined,
            aircraftMasterId: master?.id,
          }
        );
        onWarehouseDefaultsSeeded?.(baseline);
      } finally {
        setApplying(false);
      }
    },
    [proposalId, aircraftId, assumptions, onApplyDefaults, onWarehouseDefaultsSeeded, usageTypeOptions]
  );

  useEffect(() => {
    const q =
      assumptions.aircraft_manufacturer?.trim() ||
      assumptions.aircraft_model?.split(" ")[0] ||
      "";
    void searchMasters(q);
    if (assumptions.home_airport_icao) {
      void searchAirports(assumptions.home_airport_icao);
      setSelectedIcao(assumptions.home_airport_icao);
      void loadFbos(assumptions.home_airport_icao);
    }
    if (assumptions.fbo_name) setFboName(assumptions.fbo_name);
    setUsageType(assumptions.usage_type?.trim() || "part_91");
    void loadUsageTypes();
  }, [
    assumptions.aircraft_manufacturer,
    assumptions.aircraft_model,
    assumptions.home_airport_icao,
    assumptions.fbo_name,
    assumptions.usage_type,
    searchAirports,
    searchMasters,
    loadFbos,
    loadUsageTypes,
  ]);

  const typeDisplay = getAircraftDisplayName(assumptions, {
    id: "",
    year: null,
    tailNumber: null,
    serialNumber: null,
    proposedHomeBaseIcao: null,
    estimatedValue: null,
    valueSource: null,
    aircraftMaster: null,
  });

  return (
    <div className="shrink-0 border-b border-atlas-border bg-atlas-chrome/95 px-4 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SearchableSelect
          label="Aircraft type"
          placeholder="Search…"
          value={selectedMaster?.id ?? assumptions.aircraft_master_id ?? ""}
          displayValue={typeDisplay}
          options={masterOptions}
          loading={masterLoading || applying}
          onSearch={searchMasters}
          compact
          onSelect={async (opt) => {
            if (!opt) {
              setSelectedMaster(null);
              return;
            }
            const res = await fetch(
              `/api/aircraft-master/search?q=${encodeURIComponent(opt.label.split(" ")[0])}`
            );
            const json: MasterRow[] = await res.json();
            const row = json.find((r) => r.id === opt.id) ?? null;
            setSelectedMaster(row);
            void applyBundle(row, selectedIcao, fboName, usageType);
          }}
        />
        <SearchableSelect
          label="Home base"
          placeholder="ICAO…"
          value={selectedIcao}
          displayValue={
            selectedIcao
              ? airportOptions.find((o) => o.id === selectedIcao)?.label ?? selectedIcao
              : assumptions.home_airport_icao ?? ""
          }
          options={airportOptions}
          loading={airportLoading || applying}
          onSearch={searchAirports}
          compact
          onSelect={(opt) => {
            const icao = opt?.id ?? "";
            setSelectedIcao(icao);
            void loadFbos(icao);
            void applyBundle(selectedMaster, icao, fboName, usageType);
          }}
        />
        <div className="atlas-form-field">
          <label className="atlas-field-label" htmlFor="setup-fbo">
            FBO
          </label>
          {fboOptions.length > 0 ? (
            <select
              id="setup-fbo"
              value={fboName}
              disabled={applying}
              onChange={(e) => {
                const next = e.target.value;
                setFboName(next);
                void applyBundle(selectedMaster, selectedIcao, next, usageType);
              }}
              className="atlas-input"
            >
              {fboOptions.map((f) => (
                <option key={f.id} value={f.label}>
                  {f.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={fboName}
              disabled={applying}
              onChange={(e) => setFboName(e.target.value)}
              onBlur={() => void applyBundle(selectedMaster, selectedIcao, fboName, usageType)}
              className="atlas-input"
            />
          )}
        </div>
        <div className="atlas-form-field">
          <label className="atlas-field-label" htmlFor="setup-usage">
            Usage type
          </label>
          <select
            id="setup-usage"
            value={usageType}
            disabled={applying}
            onChange={(e) => {
              const v = e.target.value;
              setUsageType(v);
              void applyBundle(selectedMaster, selectedIcao, fboName, v);
            }}
            className="atlas-input"
          >
            {usageTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
