"use client";

import { useCallback, useEffect, useState } from "react";

type FleetConfig = {
  id: string;
  tailNumber: string;
  aircraftTypeId: string;
  aircraftType: string | null;
  publicDisplayType: string | null;
  seatCount: number | null;
  luggageNote: string | null;
  wifi: boolean;
  amenities: string[];
  description: string | null;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isPublicActive: boolean;
  emptyLegHourlyRateOverride: number | null;
};

type AircraftTypeOption = { id: string; name: string; label: string | null };

const emptyForm = {
  tailNumber: "",
  aircraftTypeId: "",
  publicDisplayType: "",
  seatCount: "",
  luggageNote: "",
  wifi: false,
  amenities: "",
  description: "",
  primaryPhotoUrl: "",
  photoUrls: "",
  isPublicActive: true,
  emptyLegHourlyRateOverride: "",
};

export function FleetConfigAdmin() {
  const [configs, setConfigs] = useState<FleetConfig[]>([]);
  const [types, setTypes] = useState<AircraftTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingTail, setEditingTail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [fleetRes, typesRes] = await Promise.all([
      fetch("/api/charter/empty-legs/fleet"),
      fetch("/api/charter/empty-legs/aircraft-profiles"),
    ]);
    const fleetJson = await fleetRes.json();
    const typesJson = await typesRes.json();
    setLoading(false);
    if (fleetRes.ok) {
      setConfigs(fleetJson.configs ?? []);
    } else {
      setMessage(fleetJson.error ?? "Failed to load");
    }
    if (typesRes.ok) {
      setTypes(
        typesJson.map((p: { id: string; name: string; label: string | null }) => ({
          id: p.id,
          name: p.name,
          label: p.label,
        }))
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: FleetConfig) {
    setEditingTail(row.tailNumber);
    setForm({
      tailNumber: row.tailNumber,
      aircraftTypeId: row.aircraftTypeId,
      publicDisplayType: row.publicDisplayType ?? "",
      seatCount: row.seatCount != null ? String(row.seatCount) : "",
      luggageNote: row.luggageNote ?? "",
      wifi: row.wifi,
      amenities: row.amenities.join(", "),
      description: row.description ?? "",
      primaryPhotoUrl: row.primaryPhotoUrl ?? "",
      photoUrls: row.photoUrls.join("\n"),
      isPublicActive: row.isPublicActive,
      emptyLegHourlyRateOverride:
        row.emptyLegHourlyRateOverride != null
          ? String(row.emptyLegHourlyRateOverride)
          : "",
    });
  }

  function resetForm() {
    setEditingTail(null);
    setForm(emptyForm);
  }

  async function uploadPhoto(file: File, asPrimary: boolean) {
    setUploading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Upload failed");
        return;
      }
      if (asPrimary) {
        setForm((f) => ({ ...f, primaryPhotoUrl: json.url }));
      } else {
        setForm((f) => ({
          ...f,
          photoUrls: f.photoUrls ? `${f.photoUrls}\n${json.url}` : json.url,
        }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setMessage("");
    const payload = {
      aircraftTypeId: form.aircraftTypeId || null,
      publicDisplayType: form.publicDisplayType.trim() || null,
      seatCount: form.seatCount === "" ? null : Number(form.seatCount),
      luggageNote: form.luggageNote || null,
      wifi: form.wifi,
      amenities: form.amenities,
      description: form.description || null,
      primaryPhotoUrl: form.primaryPhotoUrl || null,
      photoUrls: form.photoUrls,
      isPublicActive: form.isPublicActive,
      emptyLegHourlyRateOverride:
        form.emptyLegHourlyRateOverride === ""
          ? null
          : Number(form.emptyLegHourlyRateOverride),
    };

    const tail = form.tailNumber.trim().toUpperCase();
    if (!tail) {
      setMessage("tailNumber is required");
      return;
    }
    if (!form.aircraftTypeId) {
      setMessage("Aircraft type is required");
      return;
    }

    let res: Response;
    if (editingTail) {
      res = await fetch(`/api/charter/empty-legs/fleet/${encodeURIComponent(editingTail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/charter/empty-legs/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tailNumber: tail }),
      });
    }
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Save failed");
      return;
    }
    resetForm();
    await load();
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-atlas-accent">{message}</p> : null}

      <div className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">
          {editingTail ? `Edit ${editingTail}` : "New fleet tail"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Tail number"
            value={form.tailNumber}
            onChange={(v) => setForm({ ...form, tailNumber: v })}
            disabled={Boolean(editingTail)}
          />
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Aircraft type</label>
            <select
              value={form.aircraftTypeId}
              onChange={(e) => setForm({ ...form, aircraftTypeId: e.target.value })}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="">Select type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label || t.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Public display type"
            value={form.publicDisplayType}
            onChange={(v) => setForm({ ...form, publicDisplayType: v })}
          />
          <Field
            label="Empty-leg hourly rate override"
            value={form.emptyLegHourlyRateOverride}
            onChange={(v) => setForm({ ...form, emptyLegHourlyRateOverride: v })}
            type="number"
          />
          <Field
            label="Seat count"
            value={form.seatCount}
            onChange={(v) => setForm({ ...form, seatCount: v })}
            type="number"
          />
          <Field
            label="Luggage note"
            value={form.luggageNote}
            onChange={(v) => setForm({ ...form, luggageNote: v })}
          />
          <Field
            label="Amenities (comma list)"
            value={form.amenities}
            onChange={(v) => setForm({ ...form, amenities: v })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.wifi}
              onChange={(e) => setForm({ ...form, wifi: e.target.checked })}
            />
            Wi‑Fi
          </label>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">Primary photo URL</label>
            <input
              value={form.primaryPhotoUrl}
              onChange={(e) => setForm({ ...form, primaryPhotoUrl: e.target.value })}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              className="mt-2 text-xs"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file, true);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">
              Additional photo URLs (one per line)
            </label>
            <textarea
              value={form.photoUrls}
              onChange={(e) => setForm({ ...form, photoUrls: e.target.value })}
              rows={3}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              className="mt-2 text-xs"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file, false);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublicActive}
              onChange={(e) => setForm({ ...form, isPublicActive: e.target.checked })}
            />
            Public active
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void save()}
            className="rounded bg-atlas-accent px-3 py-1.5 text-sm text-white"
          >
            {editingTail ? "Save" : "Create"}
          </button>
          {(editingTail || form.tailNumber) && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-atlas-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-atlas-muted">Loading…</p>
      ) : configs.length === 0 ? (
        <p className="text-sm text-atlas-muted">No fleet tails saved yet.</p>
      ) : (
        <div className="overflow-hidden rounded border border-atlas-border">
          <table className="w-full text-sm">
            <thead className="bg-atlas-bg text-left text-xs text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Tail</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Seats</th>
                <th className="px-3 py-2">Rate override</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {configs.map((row) => (
                <tr key={row.id} className="border-t border-atlas-border/50">
                  <td className="px-3 py-2 font-mono">
                    {row.tailNumber}
                    {!row.isPublicActive ? (
                      <span className="ml-1 text-xs text-atlas-muted">(inactive)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.publicDisplayType || row.aircraftType || "—"}
                  </td>
                  <td className="px-3 py-2">{row.seatCount ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">
                    {row.emptyLegHourlyRateOverride != null
                      ? `$${row.emptyLegHourlyRateOverride.toLocaleString()}/hr`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-atlas-accent hover:underline"
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-atlas-muted">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm disabled:opacity-60"
      />
    </div>
  );
}
