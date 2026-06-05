"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getAircraftDisplayName, USAGE_TYPE_OPTIONS } from "@/lib/aircraft-workspace";
import { buildDefaultsFromReferences } from "@/lib/aircraft-defaults";
import type { AssumptionMap } from "@/lib/assumptions";

type MasterRow = {
  id: string;
  label: string;
  manufacturer: string;
  model: string;
  typicalFuelBurnGph: string | null;
  typicalCharterRate: string | null;
  maxRecommendedUtilization: number | null;
};

export function AircraftSetupBar({
  assumptions,
  onApplyDefaults,
}: {
  assumptions: AssumptionMap;
  onApplyDefaults: (patch: Partial<AssumptionMap>, instancePatch?: Record<string, unknown>) => void;
}) {
  const [masterOptions, setMasterOptions] = useState<{ id: string; label: string }[]>([]);
  const [airportOptions, setAirportOptions] = useState<{ id: string; label: string }[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [airportLoading, setAirportLoading] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<MasterRow | null>(null);
  const [selectedIcao, setSelectedIcao] = useState(assumptions.home_airport_icao ?? "SDL");
  const [usageType, setUsageType] = useState(
    assumptions.usage_type === "part_91_135" ? "part_91_135" : "part_91"
  );

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
        json.map((a: { icao: string; airportName: string; city: string | null }) => ({
          id: a.icao,
          label: `${a.icao} — ${a.airportName}${a.city ? `, ${a.city}` : ""}`,
        }))
      );
    }
  }, []);

  const applyBundle = useCallback(
    async (master: MasterRow | null, icao: string, usage: string) => {
      let airportDefaults = null;
      if (icao) {
        const res = await fetch(`/api/airports/${icao}`);
        if (res.ok) {
          airportDefaults = await res.json();
        }
      }
      const patch = buildDefaultsFromReferences({
        master: master
          ? {
              id: master.id,
              manufacturer: master.manufacturer,
              model: master.model,
              typicalFuelBurnGph: master.typicalFuelBurnGph,
              typicalCharterRate: master.typicalCharterRate,
              maxRecommendedUtilization: master.maxRecommendedUtilization,
            }
          : null,
        airport: airportDefaults
          ? {
              icao: airportDefaults.icao,
              airportName: airportDefaults.airportName,
              fuelPrice: airportDefaults.fuelPrice,
              hangarMonthly: airportDefaults.hangarMonthly,
              fbos: airportDefaults.fbos ?? [],
            }
          : null,
        fboId: null,
        usageType: usage,
      });
      onApplyDefaults(patch, {
        proposedHomeBaseIcao: icao || undefined,
        aircraftMasterId: master?.id,
      });
    },
    [onApplyDefaults]
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
    }
    setUsageType(assumptions.usage_type === "part_91_135" ? "part_91_135" : "part_91");
  }, [
    assumptions.aircraft_manufacturer,
    assumptions.aircraft_model,
    assumptions.home_airport_icao,
    assumptions.usage_type,
    searchAirports,
    searchMasters,
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
    <div className="shrink-0 border-b border-atlas-border bg-atlas-surface/40 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SearchableSelect
          label="Aircraft type"
          placeholder="Search…"
          value={selectedMaster?.id ?? assumptions.aircraft_master_id ?? ""}
          displayValue={typeDisplay}
          options={masterOptions}
          loading={masterLoading}
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
            void applyBundle(row, selectedIcao, usageType);
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
          loading={airportLoading}
          onSearch={searchAirports}
          compact
          onSelect={(opt) => {
            const icao = opt?.id ?? "";
            setSelectedIcao(icao);
            void applyBundle(selectedMaster, icao, usageType);
          }}
        />
        <div className="space-y-1">
          <label className="atlas-kicker block">Usage type</label>
          <select
            value={usageType}
            onChange={(e) => {
              const v = e.target.value;
              setUsageType(v);
              void applyBundle(selectedMaster, selectedIcao, v);
            }}
            className="atlas-input"
          >
            {USAGE_TYPE_OPTIONS.map((o) => (
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
