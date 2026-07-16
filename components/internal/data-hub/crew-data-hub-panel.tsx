"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import {
  CREW_SYNC_POLICY,
  type CrewPerformanceModel,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";
import { ROUTES } from "@/lib/routes";
import * as Dialog from "@radix-ui/react-dialog";

type TypeRow = {
  id: string;
  code: string;
  manufacturer: string;
  model: string;
  afmStatus?: "complete" | "partial" | "missing";
  derivedAfmNotes?: string | null;
  performanceModel?: CrewPerformanceModel | null;
  afmNotes?: string | null;
};
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
  source: string | null;
  gridSize: string;
  updatedAt: string;
};

function afmBadgeClass(status?: string) {
  if (status === "complete") return "bg-emerald-500/15 text-emerald-700";
  if (status === "partial") return "bg-amber-500/15 text-amber-800";
  return "bg-atlas-muted/20 text-atlas-muted";
}

export function CrewDataHubPanel() {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [perf, setPerf] = useState<PerfRow[]>([]);
  const [policy, setPolicy] = useState<CrewSyncPolicy>({ ...CREW_SYNC_POLICY });
  const [importMsg, setImportMsg] = useState("");
  const [afmMsg, setAfmMsg] = useState("");
  const [policyMsg, setPolicyMsg] = useState("");
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
  const [afmTypeId, setAfmTypeId] = useState("");
  const [afmJson, setAfmJson] = useState("");
  const [afmSource, setAfmSource] = useState("");
  const [afmNotes, setAfmNotes] = useState("");

  const load = useCallback(async () => {
    const [t, f, p, pol] = await Promise.all([
      fetch("/api/data/crew-types").then((r) => r.json()),
      fetch("/api/data/crew-fleet").then((r) => r.json()),
      fetch("/api/data/crew-performance").then((r) => r.json()),
      fetch("/api/data/crew-policy").then((r) => r.json()),
    ]);
    if (t.rows) setTypes(t.rows);
    if (f.rows) setFleet(f.rows);
    if (p.rows) setPerf(p.rows);
    if (pol.policy) setPolicy(pol.policy);
    return t.rows as TypeRow[] | undefined;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runImport() {
    setImportMsg("Importing real POH seed (atlas_initial_data.json)…");
    const res = await fetch("/api/data/crew-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useBundled: true }),
    });
    const json = await res.json();
    setImportMsg(res.ok ? json.message : json.error ?? "Import failed");
    if (res.ok) void load();
  }

  async function uploadAfmPackage() {
    setAfmMsg("");
    if (!afmTypeId) {
      setAfmMsg("Select an aircraft type");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(afmJson);
    } catch {
      setAfmMsg("Invalid JSON");
      return;
    }

    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? {
            ...(parsed as Record<string, unknown>),
            aircraftTypeId: afmTypeId,
            ...(afmNotes.trim() ? { afmNotes: afmNotes.trim() } : {}),
          }
        : Array.isArray(parsed)
          ? {
              aircraftTypeId: afmTypeId,
              performance: (parsed as unknown[]).map((row) => {
                if (row && typeof row === "object" && afmSource.trim()) {
                  return { ...(row as object), source: afmSource.trim() };
                }
                return row;
              }),
              ...(afmNotes.trim() ? { afmNotes: afmNotes.trim() } : {}),
            }
          : null;

    if (!body) {
      setAfmMsg("JSON must be an AFM package object or performance[] array");
      return;
    }

    // Ensure each performance row has source (UI field as fallback)
    const packageBody = body as Record<string, unknown>;
    if (Array.isArray(packageBody.performance) && afmSource.trim()) {
      packageBody.performance = packageBody.performance.map((row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const r = row as Record<string, unknown>;
        return r.source ? r : { ...r, source: afmSource.trim() };
      });
    }

    const res = await fetch("/api/data/crew-performance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packageBody),
    });
    const json = await res.json();
    if (!res.ok) {
      setAfmMsg(json.error ?? "AFM upload failed");
      return;
    }
    setAfmMsg(
      `Uploaded: ${json.gridsUpserted ?? 0} grid(s)` +
        (json.performanceModelUpdated ? ", performanceModel updated" : "")
    );
    setAfmJson("");
    void load();
  }

  async function savePolicy() {
    setPolicyMsg("");
    const res = await fetch("/api/data/crew-policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPolicyMsg(json.error ?? "Save failed");
      return;
    }
    setPolicy(json.policy);
    setPolicyMsg("Policy saved — Crew /sync will use these thresholds.");
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
          <strong className="font-medium text-atlas-text">Type</strong> owns AFM grids +
          performanceModel (upload once per type).{" "}
          <strong className="font-medium text-atlas-text">Tail</strong> owns the full{" "}
          <code className="text-atlas-accent">operating{"{}"}</code> block for Trip Check (weights,
          fuel planning, GOM). No CG yet. Canonical Crew codes:{" "}
          <code className="text-atlas-accent">B300</code>,{" "}
          <code className="text-atlas-accent">CL35</code>,{" "}
          <code className="text-atlas-accent">LR45</code> (LJ45 aliases to LR45 on sync).
        </p>
        <p className="mt-2 text-sm text-atlas-muted">
          Airport timezone overrides:{" "}
          <Link
            href={ROUTES.charter.emptyLegs}
            className="text-atlas-accent hover:underline"
          >
            Empty Legs inventory
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void runImport()}>
            Load POH seed (N1213P + B300 from atlas_initial_data.json)
          </Button>
        </div>
        {importMsg ? <p className="mt-2 text-sm text-atlas-muted">{importMsg}</p> : null}
      </div>

      <div>
        <h2 className="mb-1 font-serif text-xl">1. Aircraft types</h2>
        <p className="mb-3 text-sm text-atlas-muted">
          AFM status is derived for Crew picker warnings. Prefer codes B300 / CL35 / LR45.
        </p>
        <div className="atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Manufacturer</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">AFM</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {types.map((row) => (
                <tr key={row.id} className="border-b border-atlas-border/60">
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td className="px-3 py-2">{row.manufacturer}</td>
                  <td className="px-3 py-2">{row.model}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${afmBadgeClass(row.afmStatus)}`}
                    >
                      {row.afmStatus ?? "missing"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">
                    {row.derivedAfmNotes ?? row.afmNotes ?? "—"}
                  </td>
                </tr>
              ))}
              {types.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-atlas-muted">
                    No types yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <CrudTab
            title="Add / edit type identity"
            apiPath="/api/data/crew-types"
            onMutate={() => void load()}
            columns={[
              { key: "code", label: "Code" },
              { key: "manufacturer", label: "Manufacturer" },
              { key: "model", label: "Model" },
            ]}
            fields={[
              { key: "code", label: "Type code", required: true, placeholder: "B300" },
              {
                key: "manufacturer",
                label: "Manufacturer",
                required: true,
                placeholder: "Beechcraft",
              },
              { key: "model", label: "Model", required: true, placeholder: "King Air 350" },
            ]}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-serif text-xl">2. AFM upload (per type)</h2>
        <p className="mb-3 text-sm text-atlas-muted">
          Upload the same shape as <code>/sync</code> <code>performance[]</code> rows, optionally
          with <code>performanceModel</code>. v1 metrics only:{" "}
          <code>takeoff_field_length</code>, <code>landing_distance</code>. Source citation is
          required — never invent POH numbers.
        </p>
        <div className="space-y-3 rounded-lg border border-atlas-border bg-atlas-surface/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Aircraft type</Label>
              <select
                className="mt-1 w-full rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-sm"
                value={afmTypeId}
                onChange={(e) => setAfmTypeId(e.target.value)}
              >
                <option value="">Select…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.manufacturer} {t.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Default source citation (applied if rows omit source)</Label>
              <Input
                className="mt-1"
                value={afmSource}
                onChange={(e) => setAfmSource(e.target.value)}
                placeholder="e.g. CL35 AFM §5 Normal Takeoff"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>AFM notes (optional, stored on type)</Label>
              <Input
                className="mt-1"
                value={afmNotes}
                onChange={(e) => setAfmNotes(e.target.value)}
                placeholder="e.g. landing stand-in; takeoff POH OK"
              />
            </div>
          </div>
          <div>
            <Label>JSON package or performance[] array</Label>
            <textarea
              className="mt-1 h-40 w-full rounded border border-atlas-border bg-atlas-bg px-3 py-2 font-mono text-xs"
              value={afmJson}
              onChange={(e) => setAfmJson(e.target.value)}
              placeholder={`{\n  "performanceModel": { … },\n  "performance": [{ "metric": "takeoff_field_length", "unit": "ft", "source": "…", "axes": {…}, "values": […] }]\n}`}
            />
          </div>
          <Button type="button" onClick={() => void uploadAfmPackage()}>
            Upload / replace AFM
          </Button>
          {afmMsg ? <p className="text-sm text-atlas-muted">{afmMsg}</p> : null}
        </div>

        <div className="mt-4 atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Grid</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((row) => (
                <tr key={row.id} className="border-b border-atlas-border/60">
                  <td className="px-3 py-2">{row.aircraftTypeCode}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.metric}</td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">{row.source ?? "—"}</td>
                  <td className="px-3 py-2">{row.gridSize}</td>
                  <td className="px-3 py-2 text-atlas-muted">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {perf.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-atlas-muted">
                    No grids — upload AFM or load POH seed.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg sm:text-xl">3. Fleet tails (full operating)</h2>
            <p className="mt-1 text-sm text-atlas-muted">
              Every field ships per-tail on <code>/sync</code>. Type defaults are only for seeding
              new tails in this UI — Crew does not merge type→tail.
            </p>
          </div>
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

      <div>
        <h2 className="mb-1 font-serif text-xl">4. Org policy (safety thresholds)</h2>
        <p className="mb-3 text-sm text-atlas-muted">
          Ops-tunable runway / alternate gates for Crew PolicyStore. Never use zero — blank fields
          are rejected. Changes ship on next <code>/sync</code>.
        </p>
        <div className="grid gap-3 rounded-lg border border-atlas-border bg-atlas-surface/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CREW_SYNC_POLICY) as (keyof CrewSyncPolicy)[]).map((key) => (
            <div key={key}>
              <Label className="text-xs">{key}</Label>
              <Input
                type="number"
                className="mt-1 font-mono text-sm"
                value={String(policy[key])}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    [key]: Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => void savePolicy()}>
            Save policy
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPolicy({ ...CREW_SYNC_POLICY })}
          >
            Reset to defaults
          </Button>
        </div>
        {policyMsg ? <p className="mt-2 text-sm text-atlas-muted">{policyMsg}</p> : null}
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
              <p className="mt-1 text-xs text-atlas-muted">
                Full operating block required for Trip Check (not just BEW/MTOW). No CG fields yet.
              </p>
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
              <h3 className="mt-6 text-sm font-medium text-atlas-accent">
                Operating data (per-tail on /sync)
              </h3>
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
