"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { USAGE_TYPE_OPTIONS, usageTypeToOperatingModel } from "@/lib/aircraft-workspace";

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
      setError("Select an aircraft model");
      return;
    }
    const modelLabel = `${selectedMaster.manufacturer} ${selectedMaster.model}`.trim();

    setLoading(true);
    setError("");
    try {
      await onSubmit({
        aircraftModel: modelLabel,
        aircraftMasterId: selectedMaster.id,
        proposedHomeBase: homeBase.toUpperCase(),
        fboName,
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
          <Dialog.Title className="font-serif text-xl">Add aircraft</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-atlas-muted">
            Model, home base, FBO, and usage — other fields fill from defaults in the editor.
          </Dialog.Description>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
            <SearchableSelect
              label="Aircraft model *"
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

            <div className="space-y-1">
              <Label className="text-xs text-atlas-muted">Home base</Label>
              <input
                type="text"
                value={homeBase}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setHomeBase(v);
                  if (v.length >= 3) void loadFbos(v);
                }}
                className="h-9 w-full rounded-md border border-atlas-border bg-atlas-bg px-3 text-sm uppercase focus:border-atlas-accent focus:outline-none"
                placeholder="SDL"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-atlas-muted">FBO</Label>
              {fboOptions.length > 0 ? (
                <select
                  value={fboName}
                  onChange={(e) => setFboName(e.target.value)}
                  className="h-9 w-full rounded-md border border-atlas-border bg-atlas-bg px-3 text-sm focus:border-atlas-accent focus:outline-none"
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
                  onChange={(e) => setFboName(e.target.value)}
                  className="h-9 w-full rounded-md border border-atlas-border bg-atlas-bg px-3 text-sm focus:border-atlas-accent focus:outline-none"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-atlas-muted">Usage type</Label>
              <select
                value={usageType}
                onChange={(e) => setUsageType(e.target.value)}
                className="h-9 w-full rounded-md border border-atlas-border bg-atlas-bg px-3 text-sm focus:border-atlas-accent focus:outline-none"
              >
                {USAGE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-atlas-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
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
