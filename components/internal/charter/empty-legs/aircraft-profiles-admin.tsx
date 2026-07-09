"use client";

import { useCallback, useEffect, useState } from "react";

type AircraftProfile = {
  id: string;
  name: string;
  defaultHourlyRate: number;
  minimumQuotableTimeFallback: number | null;
  offRoutingTimeAllowanceHours: number | null;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  defaultHourlyRate: "",
  minimumQuotableTimeFallback: "",
  offRoutingTimeAllowanceHours: "",
  isActive: true,
};

export function AircraftProfilesAdmin() {
  const [rows, setRows] = useState<AircraftProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/charter/empty-legs/aircraft-profiles");
    const json = await res.json();
    setLoading(false);
    if (res.ok) setRows(json);
    else setMessage(json.error ?? "Failed to load");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: AircraftProfile) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      defaultHourlyRate: String(row.defaultHourlyRate),
      minimumQuotableTimeFallback:
        row.minimumQuotableTimeFallback != null ? String(row.minimumQuotableTimeFallback) : "",
      offRoutingTimeAllowanceHours:
        row.offRoutingTimeAllowanceHours != null
          ? String(row.offRoutingTimeAllowanceHours)
          : "",
      isActive: row.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save() {
    setMessage("");
    const payload = {
      name: form.name.trim(),
      defaultHourlyRate: Number(form.defaultHourlyRate),
      minimumQuotableTimeFallback:
        form.minimumQuotableTimeFallback === ""
          ? null
          : Number(form.minimumQuotableTimeFallback),
      offRoutingTimeAllowanceHours:
        form.offRoutingTimeAllowanceHours === ""
          ? null
          : Number(form.offRoutingTimeAllowanceHours),
      isActive: form.isActive,
    };
    const res = await fetch(
      editingId
        ? `/api/charter/empty-legs/aircraft-profiles/${editingId}`
        : "/api/charter/empty-legs/aircraft-profiles",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
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
          {editingId ? "Edit aircraft profile" : "New aircraft profile"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Default hourly rate"
            value={form.defaultHourlyRate}
            onChange={(v) => setForm({ ...form, defaultHourlyRate: v })}
            type="number"
          />
          <Field
            label="Min quotable time fallback (hrs)"
            value={form.minimumQuotableTimeFallback}
            onChange={(v) => setForm({ ...form, minimumQuotableTimeFallback: v })}
            type="number"
          />
          <Field
            label="Off-routing time allowance (hrs)"
            value={form.offRoutingTimeAllowanceHours}
            onChange={(v) => setForm({ ...form, offRoutingTimeAllowanceHours: v })}
            type="number"
          />
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
            {editingId ? "Save" : "Create"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-atlas-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-atlas-muted">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded border border-atlas-border">
          <table className="w-full text-sm">
            <thead className="bg-atlas-bg text-left text-xs text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Hourly rate</th>
                <th className="px-3 py-2">Min hours</th>
                <th className="px-3 py-2">Off-routing</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-atlas-border/50">
                  <td className="px-3 py-2">
                    {row.name}
                    {!row.isActive ? (
                      <span className="ml-1 text-xs text-atlas-muted">(inactive)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">${row.defaultHourlyRate.toLocaleString()}/hr</td>
                  <td className="px-3 py-2">{row.minimumQuotableTimeFallback ?? "—"}</td>
                  <td className="px-3 py-2">{row.offRoutingTimeAllowanceHours ?? "—"}</td>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-atlas-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
      />
    </div>
  );
}
