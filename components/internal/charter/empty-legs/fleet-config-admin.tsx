"use client";

import { useCallback, useEffect, useState } from "react";

type FleetConfig = {
  id: string;
  tailNumber: string;
  aircraftType: string;
  publicDisplayType: string | null;
  aircraftProfileId: string | null;
  seatCount: number | null;
  luggageNote: string | null;
  wifi: boolean;
  amenities: string[];
  description: string | null;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isActive: boolean;
};

type Suggestion = {
  tailNumber: string;
  aircraftType: string;
  seatCount: number | null;
};

type AircraftProfileOption = { id: string; name: string };

const emptyForm = {
  tailNumber: "",
  aircraftType: "",
  publicDisplayType: "",
  aircraftProfileId: "",
  seatCount: "",
  luggageNote: "",
  wifi: false,
  amenities: "",
  description: "",
  primaryPhotoUrl: "",
  photoUrls: "",
  isActive: true,
};

export function FleetConfigAdmin() {
  const [configs, setConfigs] = useState<FleetConfig[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [profiles, setProfiles] = useState<AircraftProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingTail, setEditingTail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [fleetRes, profilesRes] = await Promise.all([
      fetch("/api/charter/empty-legs/fleet"),
      fetch("/api/charter/empty-legs/aircraft-profiles"),
    ]);
    const fleetJson = await fleetRes.json();
    const profilesJson = await profilesRes.json();
    setLoading(false);
    if (fleetRes.ok) {
      setConfigs(fleetJson.configs ?? []);
      setSuggestions(fleetJson.suggestions ?? []);
    } else {
      setMessage(fleetJson.error ?? "Failed to load");
    }
    if (profilesRes.ok) {
      setProfiles(
        profilesJson.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
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
      aircraftType: row.aircraftType,
      publicDisplayType: row.publicDisplayType ?? "",
      aircraftProfileId: row.aircraftProfileId ?? "",
      seatCount: row.seatCount != null ? String(row.seatCount) : "",
      luggageNote: row.luggageNote ?? "",
      wifi: row.wifi,
      amenities: row.amenities.join(", "),
      description: row.description ?? "",
      primaryPhotoUrl: row.primaryPhotoUrl ?? "",
      photoUrls: row.photoUrls.join("\n"),
      isActive: row.isActive,
    });
  }

  function startFromSuggestion(s: Suggestion) {
    setEditingTail(null);
    setForm({
      ...emptyForm,
      tailNumber: s.tailNumber,
      aircraftType: s.aircraftType,
      seatCount: s.seatCount != null ? String(s.seatCount) : "",
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
      aircraftType: form.aircraftType.trim(),
      publicDisplayType: form.publicDisplayType.trim() || null,
      aircraftProfileId: form.aircraftProfileId || null,
      seatCount: form.seatCount === "" ? null : Number(form.seatCount),
      luggageNote: form.luggageNote || null,
      wifi: form.wifi,
      amenities: form.amenities,
      description: form.description || null,
      primaryPhotoUrl: form.primaryPhotoUrl || null,
      photoUrls: form.photoUrls,
      isActive: form.isActive,
    };

    const tail = form.tailNumber.trim().toUpperCase();
    if (!tail) {
      setMessage("tailNumber is required");
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

      {suggestions.length > 0 ? (
        <div className="rounded border border-atlas-border bg-atlas-surface p-4">
          <h2 className="font-serif text-lg">Crew fleet suggestions</h2>
          <p className="mt-1 text-sm text-atlas-muted">
            No empty-leg fleet configs yet. Seed from active crew fleet tails:
          </p>
          <ul className="mt-3 space-y-1">
            {suggestions.map((s) => (
              <li key={s.tailNumber} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono">
                  {s.tailNumber} · {s.aircraftType}
                  {s.seatCount != null ? ` · ${s.seatCount} seats` : ""}
                </span>
                <button
                  type="button"
                  className="text-atlas-accent hover:underline"
                  onClick={() => startFromSuggestion(s)}
                >
                  Configure
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">
          {editingTail ? `Edit ${editingTail}` : "New / seed fleet config"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Tail number"
            value={form.tailNumber}
            onChange={(v) => setForm({ ...form, tailNumber: v })}
            disabled={Boolean(editingTail)}
          />
          <Field
            label="Aircraft type"
            value={form.aircraftType}
            onChange={(v) => setForm({ ...form, aircraftType: v })}
          />
          <Field
            label="Public display type"
            value={form.publicDisplayType}
            onChange={(v) => setForm({ ...form, publicDisplayType: v })}
          />
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Pricing profile</label>
            <select
              value={form.aircraftProfileId}
              onChange={(e) => setForm({ ...form, aircraftProfileId: e.target.value })}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
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
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
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
        <p className="text-sm text-atlas-muted">No fleet configs saved yet.</p>
      ) : (
        <div className="overflow-hidden rounded border border-atlas-border">
          <table className="w-full text-sm">
            <thead className="bg-atlas-bg text-left text-xs text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Tail</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Seats</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {configs.map((row) => (
                <tr key={row.id} className="border-t border-atlas-border/50">
                  <td className="px-3 py-2 font-mono">
                    {row.tailNumber}
                    {!row.isActive ? (
                      <span className="ml-1 text-xs text-atlas-muted">(inactive)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.publicDisplayType || row.aircraftType}
                  </td>
                  <td className="px-3 py-2">{row.seatCount ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">
                    {profiles.find((p) => p.id === row.aircraftProfileId)?.name ?? "—"}
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
