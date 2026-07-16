"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrudTab } from "@/components/internal/data-hub/crud-tab";
import { CrewRunwaySlopesPanel } from "@/components/internal/data-hub/crew-runway-slopes-panel";
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
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    const [t, f, p] = await Promise.all([
      fetch("/api/data/crew-types").then((r) => r.json()),
      fetch("/api/data/crew-fleet").then((r) => r.json()),
      fetch("/api/data/crew-performance").then((r) => r.json()),
    ]);
    if (t.rows) setTypes(t.rows);
    if (f.rows) setFleet(f.rows);
    if (p.rows) setPerf(p.rows);
    return t.rows as TypeRow[] | undefined;
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

  async function openFleetCreate() {
    setSaveError("");
    const latestTypes = (await load()) ?? types;
    setEditingFleet(null);
    setFleetForm({
      tailNumber: "",
      aircraftTypeId: latestTypes[0]?.id ?? "",
      status: "active",
      homeBase: "",
      serialNumber: "",
      operating: { ...CREW_OPERATING_DEFAULTS },
    });
    setFleetOpen(true);
  }

  function openFleetEdit(row: FleetRow) {
    setSaveError("");
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
    const tailNumber = fleetForm.tailNumber.trim();
    if (!tailNumber) {
      setSaveError("Tail number is required.");
      return;
    }
    if (!fleetForm.aircraftTypeId) {
      setSaveError("Select an aircraft type (add one in step 1 first).");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const body = {
        tailNumber,
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
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSaveError(json.error ?? "Save failed — check tail number is unique.");
        return;
      }
      setFleetOpen(false);
      void load();
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
          Unified fleet tails and type-level POH performance for Crew, Schedule, and Empty Legs.
          <strong className="font-medium text-atlas-text"> Type</strong> holds base performance
          grids; <strong className="font-medium text-atlas-text"> Tail</strong> holds actual
          airframe weights (BEW, MTOW, etc.) and operating factors. Crew sync uses{" "}
          <code className="text-atlas-accent">GET /api/v1/crew/sync</code>.
        </p>
        <div className="mt-4 rounded-md border border-atlas-accent/20 bg-atlas-accent/5 p-4">
          <h3 className="text-sm font-medium text-atlas-text">Adding a new aircraft type</h3>
          <p className="mt-1 text-sm text-atlas-muted">
            Prefer creating the commercial type under{" "}
            <span className="text-atlas-text">Aircraft types</span>, then add performance + tails
            here. Order for Crew sync:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-atlas-muted">
            <li>
              <span className="text-atlas-text">Aircraft type</span> — code (e.g. C25B),
              manufacturer, model (and AM / empty-leg defaults on the Aircraft types tab)
            </li>
            <li>
              <span className="text-atlas-text">Performance grids</span> for that type — takeoff
              field length and landing distance
            </li>
            <li>
              <span className="text-atlas-text">One or more tails</span> of that type, each with
              actual weights (BEW, MTOW, MZFW) and remaining operating factors
            </li>
          </ol>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void runImport()}>Load bundled seed (N1213P + B300)</Button>
        </div>
        {importMsg ? <p className="mt-2 text-sm text-atlas-muted">{importMsg}</p> : null}
      </div>

      <CrudTab
        title="1. Aircraft types"
        apiPath="/api/data/crew-types"
        onMutate={() => void load()}
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
        <h2 className="mb-1 font-serif text-xl">2. Performance grids</h2>
        <p className="mb-3 text-sm text-atlas-muted">
          Type-level takeoff and landing tables (pressure altitude × weight × OAT). Each type needs
          both <code className="text-atlas-accent">takeoffFieldLength</code> and{" "}
          <code className="text-atlas-accent">landingDistance</code>. Import from Crew&apos;s export
          JSON (bundled seed or <code>/api/data/crew-import</code>) or POST grid JSON to{" "}
          <code>/api/data/crew-performance</code>.
        </p>
        <div className="atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full min-w-[520px] text-left text-sm">
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
                    No grids — add a type, then import or POST performance data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-serif text-lg sm:text-xl">3. Charter fleet (tails)</h2>
          <Button type="button" onClick={() => void openFleetCreate()} disabled={types.length === 0}>
            Add tail
          </Button>
        </div>
        {types.length === 0 ? (
          <p className="text-sm text-atlas-muted">Add an aircraft type first.</p>
        ) : (
          <div className="atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
            <table className="w-full min-w-[640px] text-left text-sm">
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

      <Dialog.Root
        open={fleetOpen}
        onOpenChange={(open) => {
          setFleetOpen(open);
          if (!open) setSaveError("");
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(640px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-atlas-border bg-atlas-bg shadow-xl sm:w-[min(640px,94vw)]">
            <div className="shrink-0 border-b border-atlas-border px-6 py-4">
              <Dialog.Title className="font-serif text-xl">
                {editingFleet ? `Edit ${editingFleet.tailNumber}` : "Add tail"}
              </Dialog.Title>
            </div>
            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="shrink-0 border-t border-atlas-border px-6 py-4">
              {saveError ? (
                <p className="mb-3 text-sm text-atlas-danger">{saveError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setFleetOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveFleet()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <CrewRunwaySlopesPanel />
    </div>
  );
}
