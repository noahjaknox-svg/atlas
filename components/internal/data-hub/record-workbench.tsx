"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/internal/data-hub/delete-confirm-dialog";

export type WorkbenchField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "bool";
  required?: boolean;
  group?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

type Row = Record<string, unknown> & { id?: string };

type ListPayload = {
  rows: Row[];
  total?: number;
  filtered?: number;
};

function isListPayload(data: unknown): data is ListPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "rows" in data &&
    Array.isArray((data as ListPayload).rows)
  );
}

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function RecordWorkbench({
  title,
  apiPath,
  fields,
  primaryKey,
  subtitle,
  searchKeys,
  filter,
  initialData,
  enableCopy = false,
  newDefaults,
}: {
  /** Singular noun, e.g. "Aircraft" or "FBO". */
  title: string;
  apiPath: string;
  fields: WorkbenchField[];
  /** Row key used as the main label in the list. */
  primaryKey: string;
  /** Secondary line under each list item. */
  subtitle?: (row: Row) => string;
  /** Row keys matched against the search box (case-insensitive). */
  searchKeys: string[];
  /** Dropdown filter derived from distinct values of a row key. */
  filter?: { rowKey: string; allLabel: string; format?: (v: string) => string };
  initialData?: ListPayload | null;
  /** Show a Copy button that POSTs { copyFromId }. */
  enableCopy?: boolean;
  newDefaults?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Row[]>(initialData?.rows ?? []);
  const skipInitialLoad = useRef(!!initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (selectAfterId?: string) => {
      const url = `${apiPath}?limit=500`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: unknown = await res.json();
      const nextRows = isListPayload(data)
        ? data.rows
        : Array.isArray(data)
          ? (data as Row[])
          : [];
      setRows(nextRows);
      if (selectAfterId) {
        const found = nextRows.find((r) => r.id === selectAfterId);
        if (found) selectRow(found);
      }
    },
    // selectRow is stable enough; intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiPath]
  );

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load();
  }, [load]);

  function selectRow(row: Row) {
    setCreating(false);
    setSelectedId(row.id ?? null);
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = toStr(row[f.key]);
    setValues(next);
    setError(null);
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = newDefaults?.[f.key] ?? "";
    setValues(next);
    setError(null);
  }

  const filterOptions = useMemo(() => {
    if (!filter) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const v = toStr(r[filter.rowKey]).trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, filter]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter && filterValue && toStr(r[filter.rowKey]) !== filterValue) return false;
      if (!q) return true;
      return searchKeys.some((k) => toStr(r[k]).toLowerCase().includes(q));
    });
  }, [rows, search, filterValue, filter, searchKeys]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, WorkbenchField[]>();
    for (const f of fields) {
      const g = f.group ?? "";
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
        order.push(g);
      }
      byGroup.get(g)!.push(f);
    }
    return order.map((g) => ({ name: g, fields: byGroup.get(g)! }));
  }, [fields]);

  async function save() {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.key] ?? "";
        if (f.type === "number") body[f.key] = v === "" ? null : parseFloat(v);
        else body[f.key] = v;
      }
      const url = selectedId ? `${apiPath}/${selectedId}` : apiPath;
      const res = await fetch(url, {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed");
        return;
      }
      const savedId = (json as Row).id ?? selectedId ?? undefined;
      await load(savedId);
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyFromId: selectedId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Copy failed");
        return;
      }
      await load((json as Row).id);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!selectedId) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiPath}/${selectedId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "Delete failed");
        return;
      }
      setDeleteOpen(false);
      setSelectedId(null);
      setCreating(false);
      setValues({});
      await load();
    } finally {
      setDeleting(false);
    }
  }

  const editing = creating || selectedId != null;
  const heading = creating
    ? `New ${title}`
    : values[primaryKey]?.trim() || `Edit ${title}`;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex min-h-0 w-56 shrink-0 flex-col border-r border-atlas-border bg-atlas-surface/20 xl:w-60">
        <div className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3">
          <Input
            placeholder={`Search ${title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filter ? (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="h-10 w-full rounded border border-atlas-border bg-atlas-surface px-3 text-sm"
            >
              <option value="">{filter.allLabel}</option>
              {filterOptions.map((v) => (
                <option key={v} value={v}>
                  {filter.format ? filter.format(v) : v}
                </option>
              ))}
            </select>
          ) : null}
          <Button className="w-full" onClick={startCreate}>
            + Add {title}
          </Button>
        </div>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {visibleRows.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">No {title.toLowerCase()} found.</p>
          ) : (
            <nav className="space-y-0.5" aria-label={title}>
              {visibleRows.map((row) => {
                const active = row.id === selectedId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectRow(row)}
                    className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                        : "text-atlas-muted hover:bg-atlas-border/30"
                    }`}
                  >
                    <span className="block truncate font-medium">
                      {toStr(row[primaryKey]) || "Untitled"}
                    </span>
                    {subtitle ? (
                      <span className="block truncate text-xs text-atlas-muted/80">
                        {subtitle(row)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!editing ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-muted">
            Select a {title.toLowerCase()} from the list, or add a new one.
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-atlas-border px-4 py-3">
              <h2 className="min-w-0 truncate font-serif text-lg font-medium sm:text-xl">
                {heading}
              </h2>
              {enableCopy && selectedId ? (
                <Button variant="secondary" onClick={() => void copy()} disabled={saving}>
                  Copy
                </Button>
              ) : null}
            </header>

            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.name || "_"}>
                    {group.name ? (
                      <h3 className="mb-3 border-b border-atlas-border/60 pb-2 text-base font-semibold text-atlas-text">
                        {group.name}
                      </h3>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {group.fields.map((f) => (
                        <div key={f.key} className="min-w-0">
                          <label htmlFor={f.key} className="mb-1 block text-xs text-atlas-muted">
                            {f.label}
                            {f.required ? " *" : ""}
                          </label>
                          {f.type === "select" || f.type === "bool" ? (
                            <select
                              id={f.key}
                              value={values[f.key] ?? ""}
                              onChange={(e) =>
                                setValues((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                              className="h-10 w-full rounded border border-atlas-border bg-atlas-surface px-3 text-sm"
                            >
                              <option value="">{f.placeholder ?? "Select…"}</option>
                              {(f.options ?? []).map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={f.key}
                              type={f.type === "number" ? "number" : "text"}
                              value={values[f.key] ?? ""}
                              placeholder={f.placeholder}
                              onChange={(e) =>
                                setValues((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-atlas-border px-4 py-3">
              <div>
                {selectedId ? (
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteOpen(true)}
                    className="text-atlas-danger hover:bg-atlas-danger/10"
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {error ? <p className="text-sm text-atlas-danger">{error}</p> : null}
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        confirming={deleting}
      />
    </div>
  );
}
