"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ROUTES } from "@/lib/routes";

// Store the ICAO, not the FAA LID: a bare "SDL" also matches foreign airports' local
// codes (e.g. Saladillo, AR) in the timezone lookup. FBO matching treats SDL/KSDL alike.
const DEFAULT_BASE = "KSDL";
const DEFAULT_FBO = "PrismJet";

function airportLabel(a: { icao?: string | null; id?: string; airportName?: string; city?: string | null }) {
  const code = a.icao ?? a.id ?? "";
  return `${code} — ${a.airportName ?? ""}${a.city ? `, ${a.city}` : ""}`;
}

type MasterRow = {
  id: string;
  label: string;
  manufacturer: string;
  model: string;
};

export type AddAircraftPayload = {
  aircraftModel: string;
  aircraftMasterId?: string;
  proposedHomeBase: string;
  fboName: string;
  usageType: string;
};

export function AddAircraftModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AddAircraftPayload) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [masterOptions, setMasterOptions] = useState<{ id: string; label: string }[]>([]);
  const [fboOptions, setFboOptions] = useState<{ id: string; label: string }[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<MasterRow | null>(null);
  const [homeBase, setHomeBase] = useState(DEFAULT_BASE);
  const [homeBaseLabel, setHomeBaseLabel] = useState(DEFAULT_BASE);
  const [airportOptions, setAirportOptions] = useState<{ id: string; label: string }[]>([]);
  const [airportLoading, setAirportLoading] = useState(false);
  const [fbosLoading, setFbosLoading] = useState(false);
  const fboRequestRef = useRef("");
  const [fboName, setFboName] = useState(DEFAULT_FBO);
  const [usageType, setUsageType] = useState("part_91");
  const [usageTypeOptions, setUsageTypeOptions] = useState<{ value: string; label: string }[]>([]);

  const searchMasters = useCallback(async (q: string) => {
    setMasterLoading(true);
    const res = await fetch(`/api/aircraft-master/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setMasterLoading(false);
    if (res.ok) {
      setMasterOptions(json.map((r: MasterRow) => ({ id: r.id, label: r.label })));
    }
  }, []);

  const loadUsageTypes = useCallback(async () => {
    const res = await fetch("/api/data/usage-types");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const rows = (json.rows ?? []) as { name: string; active: boolean }[];
    const options = rows.filter((r) => r.active).map((r) => ({ value: r.name, label: r.name }));
    if (options.length === 0) return;
    setUsageTypeOptions(options);
    setUsageType((prev) => (options.some((o) => o.value === prev) ? prev : options[0]!.value));
  }, []);

  const searchAirports = useCallback(async (q: string) => {
    setAirportLoading(true);
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
      const json = await res.json().catch(() => []);
      if (!res.ok) return;
      setAirportOptions(
        (json as Array<{ id: string; icao?: string | null; label?: string; airportName?: string; city?: string | null }>).map(
          (a) => ({ id: a.icao ?? a.id, label: a.label ?? airportLabel(a) })
        )
      );
    } finally {
      setAirportLoading(false);
    }
  }, []);

  /** FBOs on file at the airport; also resolves the airport's display label. */
  const loadFbos = useCallback(async (icao: string, opts?: { labelFromResponse?: boolean }) => {
    fboRequestRef.current = icao;
    setFboOptions([]);
    setFboName("");
    if (!icao) return;
    setFbosLoading(true);
    try {
      const res = await fetch(`/api/airports/${encodeURIComponent(icao)}`);
      const json = await res.json().catch(() => ({}));
      if (fboRequestRef.current !== icao) return; // a newer airport was picked meanwhile
      if (!res.ok) return;
      if (opts?.labelFromResponse) setHomeBaseLabel(airportLabel(json));
      const fbos = (json.fbos ?? []).map((f: { id: string; fboName: string }) => ({
        id: f.id,
        label: f.fboName,
      }));
      setFboOptions(fbos);
      const prism = fbos.find(
        (f: { label: string }) => f.label.toLowerCase() === DEFAULT_FBO.toLowerCase()
      );
      if (prism) setFboName(prism.label);
      else if (fbos.length > 0) setFboName(fbos[0].label);
    } finally {
      if (fboRequestRef.current === icao) setFbosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setHomeBase(DEFAULT_BASE);
    setHomeBaseLabel(DEFAULT_BASE);
    setUsageType("part_91");
    setSelectedMaster(null);
    setError("");
    void loadFbos(DEFAULT_BASE, { labelFromResponse: true });
    void searchMasters("");
    void loadUsageTypes();
  }, [open, loadFbos, searchMasters, loadUsageTypes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaster) {
      setError("Select an aircraft model from the warehouse.");
      return;
    }

    const base = homeBase.trim().toUpperCase();
    if (!base) {
      setError("Search for and select a home base airport.");
      return;
    }

    if (!fboName.trim() || !fboOptions.some((f) => f.label === fboName)) {
      setError("Select an FBO at the home base.");
      return;
    }

    const modelLabel = `${selectedMaster.manufacturer} ${selectedMaster.model}`.trim();

    setLoading(true);
    setError("");
    try {
      await onSubmit({
        aircraftModel: modelLabel,
        aircraftMasterId: selectedMaster.id,
        proposedHomeBase: base,
        fboName: fboName.trim(),
        usageType,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add aircraft");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-surface p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="atlas-dialog-title">Add aircraft</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-atlas-muted">
            Model, home base, FBO, and usage — other fields fill from defaults in the editor.
          </Dialog.Description>

          <form onSubmit={(e) => void handleSubmit(e)} className="atlas-form-stack mt-6">
            <SearchableSelect
              label="Aircraft model"
              placeholder="Search make & model…"
              value={selectedMaster?.id ?? ""}
              displayValue={
                selectedMaster
                  ? `${selectedMaster.manufacturer} ${selectedMaster.model}`.trim()
                  : ""
              }
              options={masterOptions}
              loading={masterLoading}
              onSearch={searchMasters}
              onSelect={async (opt) => {
                if (!opt) {
                  setSelectedMaster(null);
                  return;
                }
                const res = await fetch(
                  `/api/aircraft-master/search?q=${encodeURIComponent(opt.label.split(" ")[0])}`
                );
                const json: MasterRow[] = await res.json();
                setSelectedMaster(json.find((r) => r.id === opt.id) ?? null);
              }}
            />

            <SearchableSelect
              label="Home base"
              placeholder="Search ICAO, airport name or city…"
              value={homeBase}
              displayValue={homeBaseLabel}
              options={airportOptions}
              loading={airportLoading}
              onSearch={searchAirports}
              onSelect={(opt) => {
                const code = opt?.id ?? "";
                setHomeBase(code);
                setHomeBaseLabel(opt?.label ?? "");
                void loadFbos(code);
              }}
            />

            <div className="atlas-form-field">
              <label className="atlas-field-label" htmlFor="add-aircraft-fbo">
                FBO
              </label>
              {fboOptions.length > 0 ? (
                <select
                  id="add-aircraft-fbo"
                  value={fboName}
                  onChange={(e) => setFboName(e.target.value)}
                  className="atlas-input"
                >
                  {fboOptions.map((f) => (
                    <option key={f.id} value={f.label}>
                      {f.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-md border border-atlas-border px-3 py-2 text-sm text-atlas-muted">
                  {!homeBase
                    ? "Select a home base first."
                    : fbosLoading
                      ? "Loading FBOs…"
                      : (
                        <>
                          No FBOs on file at {homeBase}.{" "}
                          <Link
                            href={`${ROUTES.dataWarehouse.data}?tab=fbos`}
                            target="_blank"
                            className="text-atlas-accent hover:underline"
                          >
                            Add one in Data Hub
                          </Link>
                          , then pick the airport again.
                        </>
                      )}
                </p>
              )}
            </div>

            <div className="atlas-form-field">
              <label className="atlas-field-label" htmlFor="add-aircraft-usage">
                Usage type
              </label>
              <select
                id="add-aircraft-usage"
                value={usageType}
                onChange={(e) => setUsageType(e.target.value)}
                className="atlas-input"
              >
                {usageTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <p className="rounded-md border border-atlas-danger/30 bg-atlas-danger/10 px-3 py-2 text-sm text-atlas-danger">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-atlas-border/60 pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading || !selectedMaster || !fboName}>
                {loading ? "Adding…" : "Add aircraft"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
