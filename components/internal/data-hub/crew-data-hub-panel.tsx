"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrudTab } from "@/components/internal/data-hub/crud-tab";
import {
  CREW_OPERATING_DEFAULTS,
  CREW_OPERATING_FIELD_META,
  parseOperatingJson,
  type CrewOperatingData,
} from "@/lib/crew/types";
import * as Dialog from "@radix-ui/react-dialog";

type TypeRow = { id: string; code: string; manufacturer: string; model: string };
type FleetRow = {
  id: string;
  tailNumber: string;
  aircraftTypeId: string;
  aircraftTypeCode: string;
  status: string;
  homeBase: string | null;
  serialNumber: string | null;
  operating: CrewOperatingData;
};
type PerfRow = {
  id: string;
  aircraftTypeCode: string;
  metric: string;
  gridSize: string;
  updatedAt: string;
};

export function CrewDataHubPanel() {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [perf, setPerf] = useState<PerfRow[]>([]);
  const [importMsg, setImportMsg] = useState("");
  const [fleetOpen, setFleetOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<FleetRow | null>(null);
  const [fleetForm, setFleetForm] = useState({
    tailNumber: "",
    aircraftTypeId: "",
    status: "active",
    homeBase: "",
    serialNumber: "",
    operating: { ...CREW_OPERATING_DEFAULTS },
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [t, f, p] = await Promise.all([
      fetch("/api/data/crew-types").then((r) => r.json()),
      fetch("/api/data/crew-fleet").then((r) => r.json()),
      fetch("/api/data/crew-performance").then((r) => r.json()),
    ]);
    if (t.rows) setTypes(t.rows);
    if (f.rows) setFleet(f.rows);
    if (p.rows) setPerf(p.rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runImport() {
    setImportMsg("Importing…");
    const res = await fetch("/api/data/crew-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useBundled: true }),
    });
    const json = await res.json();
    setImportMsg(res.ok ? json.message : json.error ?? "Import failed");
    if (res.ok) void load();
  }

  function openFleetCreate() {
    setEditingFleet(null);
    setFleetForm({
      tailNumber: "",
      aircraftTypeId: types[0]?.id ?? "",
      status: "active",
      homeBase: "",
      serialNumber: "",
      operating: { ...CREW_OPERATING_DEFAULTS },
    });
    setFleetOpen(true);
  }

  function openFleetEdit(row: FleetRow) {
    setEditingFleet(row);
    setFleetForm({
      tailNumber: row.tailNumber,
      aircraftTypeId: row.aircraftTypeId,
      status: row.status,
      homeBase: row.homeBase ?? "",
      serialNumber: row.serialNumber ?? "",
      operating: parseOperatingJson(row.operating),
    });
    setFleetOpen(true);
  }

  async function saveFleet() {
    setSaving(true);
    try {
      const body = {
        tailNumber: fleetForm.tailNumber,
        aircraftTypeId: fleetForm.aircraftTypeId,
        status: fleetForm.status,
        homeBase: fleetForm.homeBase || null,
        serialNumber: fleetForm.serialNumber || null,
        operating: fleetForm.operating,
      };
      const url = editingFleet
        ? `/api/data/crew-fleet/${editingFleet.id}`
        : "/api/data/crew-fleet";
      const res = await fetch(url, {
        method: editingFleet ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setFleetOpen(false);
        void load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteFleet(id: string) {
    if (!confirm("Delete this tail from the Crew fleet registry?")) return;
    await fetch(`/api/data/crew-fleet/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-10">
      <div className="rounded-lg border border-atlas-border bg-atlas-surface/40 p-4">
        <p className="text-sm text-atlas-muted">
          Operational fleet and performance tables for the PrismJet Crew iOS app. Crew pulls{" "}
          <code className="text-atlas-accent">GET /api/v1/crew/sync</code> with a read-only API key.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void runImport()}>Load bundled seed (N1213P + B300)</Button>
        </div>
        {importMsg ? <p className="mt-2 text-sm text-atlas-muted">{importMsg}</p> : null}
      </div>

      <CrudTab
        title="Crew aircraft types"
        apiPath="/api/data/crew-types"
        columns={[
          { key: "code", label: "Code" },
          { key: "manufacturer", label: "Manufacturer" },
          { key: "model", label: "Model" },
        ]}
        fields={[
          { key: "code", label: "Type code", required: true, placeholder: "B300" },
          { key: "manufacturer", label: "Manufacturer", required: true, placeholder: "Beechcraft" },
          { key: "model", label: "Model", required: true, placeholder: "King Air 350" },
        ]}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl">Charter fleet (tails)</h2>
          <Button onClick={openFleetCreate} disabled={types.length === 0}>
            Add tail
          </Button>
        </div>
        {types.length === 0 ? (
          <p className="text-sm text-atlas-muted">Add an aircraft type first.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-atlas-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
                <tr>
                  <th className="px-3 py-2">Tail</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Base</th>
                  <th className="px-3 py-2">BEW (lb)</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {fleet.map((row) => (
                  <tr key={row.id} className="border-b border-atlas-border/60">
                    <td className="px-3 py-2 font-mono">{row.tailNumber}</td>
                    <td className="px-3 py-2">{row.aircraftTypeCode}</td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                    <td className="px-3 py-2">{row.homeBase ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">
                      {parseOperatingJson(row.operating).basicEmptyWeightLb}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" className="text-xs" onClick={() => openFleetEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs text-atlas-danger"
                        onClick={() => void deleteFleet(row.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {fleet.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-atlas-muted">
                      No tails — import seed or add a tail.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-serif text-xl">Performance grids</h2>
        <p className="mb-3 text-sm text-atlas-muted">
          Type-level takeoff and landing tables (pressure altitude × weight × OAT). Re-import bundled
          seed or POST JSON to <code>/api/data/crew-performance</code> to replace grids.
        </p>
        <div className="overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2">Grid</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((row) => (
                <tr key={row.id} className="border-b border-atlas-border/60">
                  <td className="px-3 py-2">{row.aircraftTypeCode}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.metric}</td>
                  <td className="px-3 py-2">{row.gridSize}</td>
                  <td className="px-3 py-2 text-atlas-muted">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {perf.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-atlas-muted">
                    No grids — run bundled seed import.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog.Root open={fleetOpen} onOpenChange={setFleetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(640px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-atlas-border bg-atlas-bg p-6 shadow-xl">
            <Dialog.Title className="font-serif text-xl">
              {editingFleet ? `Edit ${editingFleet.tailNumber}` : "Add tail"}
            </Dialog.Title>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tail number</Label>
                <Input
                  value={fleetForm.tailNumber}
                  onChange={(e) =>
                    setFleetForm((f) => ({ ...f, tailNumber: e.target.value.toUpperCase() }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Aircraft type</Label>
                <select
                  className="mt-1 w-full rounded border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
                  value={fleetForm.aircraftTypeId}
                  onChange={(e) =>
                    setFleetForm((f) => ({ ...f, aircraftTypeId: e.target.value }))
                  }
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.manufacturer} {t.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 w-full rounded border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
                  value={fleetForm.status}
                  onChange={(e) => setFleetForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <Label>Home base (ICAO)</Label>
                <Input
                  value={fleetForm.homeBase}
                  onChange={(e) =>
                    setFleetForm((f) => ({ ...f, homeBase: e.target.value.toUpperCase() }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Serial number</Label>
                <Input
                  value={fleetForm.serialNumber}
                  onChange={(e) =>
                    setFleetForm((f) => ({ ...f, serialNumber: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <h3 className="mt-6 text-sm font-medium text-atlas-accent">Operating data</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CREW_OPERATING_FIELD_META.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  {field.type === "boolean" ? (
                    <input
                      type="checkbox"
                      className="mt-2"
                      checked={Boolean(fleetForm.operating[field.key])}
                      onChange={(e) =>
                        setFleetForm((f) => ({
                          ...f,
                          operating: { ...f.operating, [field.key]: e.target.checked },
                        }))
                      }
                    />
                  ) : (
                    <Input
                      type="number"
                      className="mt-1 font-mono text-sm"
                      value={String(fleetForm.operating[field.key])}
                      onChange={(e) =>
                        setFleetForm((f) => ({
                          ...f,
                          operating: {
                            ...f.operating,
                            [field.key]: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFleetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveFleet()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
