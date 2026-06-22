"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { USAGE_TYPE_OPTIONS } from "@/lib/aircraft-workspace";

const DEFAULT_BASE = "SDL";
const DEFAULT_FBO = "PrismJet";

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
  const [fboName, setFboName] = useState(DEFAULT_FBO);
  const [usageType, setUsageType] = useState("part_91");

  const searchMasters = useCallback(async (q: string) => {
    setMasterLoading(true);
    const res = await fetch(`/api/aircraft-master/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setMasterLoading(false);
    if (res.ok) {
      setMasterOptions(json.map((r: MasterRow) => ({ id: r.id, label: r.label })));
    }
  }, []);

  const loadFbos = useCallback(async (icao: string) => {
    const res = await fetch(`/api/airports/${icao}`);
    const json = await res.json();
    if (!res.ok) return;
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
  }, []);

  useEffect(() => {
    if (!open) return;
    setHomeBase(DEFAULT_BASE);
    setFboName(DEFAULT_FBO);
    setUsageType("part_91");
    setSelectedMaster(null);
    setError("");
    void loadFbos(DEFAULT_BASE);
    void searchMasters("");
  }, [open, loadFbos, searchMasters]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaster) {
      setError("Select an aircraft model from the warehouse.");
      return;
    }

    const base = homeBase.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(base)) {
      setError("Enter a valid home base code (3–4 characters, e.g. SDL or KSDL).");
      return;
    }

    if (!fboName.trim()) {
      setError("Select an FBO at the home base.");
      return;
    }

    if (fboOptions.length > 0 && !fboOptions.some((f) => f.label === fboName)) {
      setError("Choose an FBO from the list for this airport.");
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

            <div className="atlas-form-field">
              <label className="atlas-field-label" htmlFor="add-aircraft-base">
                Home base
              </label>
              <input
                id="add-aircraft-base"
                type="text"
                value={homeBase}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setHomeBase(v);
                  if (v.length >= 3) void loadFbos(v);
                }}
                className="atlas-input atlas-input-mono uppercase"
                placeholder="SDL"
              />
            </div>

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
                <input
                  id="add-aircraft-fbo"
                  type="text"
                  value={fboName}
                  onChange={(e) => setFboName(e.target.value)}
                  className="atlas-input"
                />
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
                {USAGE_TYPE_OPTIONS.map((o) => (
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
              <Button type="submit" disabled={loading || !selectedMaster}>
                {loading ? "Adding…" : "Add aircraft"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
