"use client";

import { useCallback, useEffect, useState } from "react";

type RoutingProfile = {
  id: string;
  name: string;
  scope: "global" | "public_list";
  publicListId: string | null;
  depIcao: string;
  arrIcao: string;
  fixedPrice: number;
  tailNumbers: string[];
  isActive: boolean;
};

type PublicListOption = { id: string; name: string };

const emptyForm = {
  name: "",
  scope: "global" as "global" | "public_list",
  publicListId: "",
  depIcao: "",
  arrIcao: "",
  fixedPrice: "",
  tailNumbers: "",
  isActive: true,
};

export function RoutingProfilesAdmin() {
  const [rows, setRows] = useState<RoutingProfile[]>([]);
  const [lists, setLists] = useState<PublicListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [profilesRes, listsRes] = await Promise.all([
      fetch("/api/charter/empty-legs/routing-profiles"),
      fetch("/api/charter/empty-legs/public-lists"),
    ]);
    const profilesJson = await profilesRes.json();
    const listsJson = await listsRes.json();
    setLoading(false);
    if (profilesRes.ok) setRows(profilesJson);
    else setMessage(profilesJson.error ?? "Failed to load");
    if (listsRes.ok) {
      setLists(listsJson.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: RoutingProfile) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      scope: row.scope,
      publicListId: row.publicListId ?? "",
      depIcao: row.depIcao,
      arrIcao: row.arrIcao,
      fixedPrice: String(row.fixedPrice),
      tailNumbers: row.tailNumbers.join(", "),
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
      scope: form.scope,
      publicListId: form.scope === "public_list" ? form.publicListId || null : null,
      depIcao: form.depIcao.trim(),
      arrIcao: form.arrIcao.trim(),
      fixedPrice: Number(form.fixedPrice),
      tailNumbers: form.tailNumbers,
      isActive: form.isActive,
    };
    const res = await fetch(
      editingId
        ? `/api/charter/empty-legs/routing-profiles/${editingId}`
        : "/api/charter/empty-legs/routing-profiles",
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
        <h2 className="font-serif text-lg">{editingId ? "Edit profile" : "New routing profile"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Scope</label>
            <select
              value={form.scope}
              onChange={(e) =>
                setForm({ ...form, scope: e.target.value as "global" | "public_list" })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="global">Global</option>
              <option value="public_list">Public list</option>
            </select>
          </div>
          {form.scope === "public_list" ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-atlas-muted">Public list</label>
              <select
                value={form.publicListId}
                onChange={(e) => setForm({ ...form, publicListId: e.target.value })}
                className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <TextField
            label="Departure ICAO"
            value={form.depIcao}
            onChange={(v) => setForm({ ...form, depIcao: v })}
          />
          <TextField
            label="Arrival ICAO"
            value={form.arrIcao}
            onChange={(v) => setForm({ ...form, arrIcao: v })}
          />
          <TextField
            label="Fixed price"
            value={form.fixedPrice}
            onChange={(v) => setForm({ ...form, fixedPrice: v })}
            type="number"
          />
          <TextField
            label="Tail numbers (comma-separated)"
            value={form.tailNumbers}
            onChange={(v) => setForm({ ...form, tailNumbers: v })}
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
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Tails</th>
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
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.depIcao}→{row.arrIcao}
                  </td>
                  <td className="px-3 py-2">${row.fixedPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 capitalize">{row.scope.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">
                    {row.tailNumbers.length ? row.tailNumbers.join(", ") : "All"}
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

function TextField({
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
