"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/internal/data-hub/data-table";
import { EntityDialog, type FormField } from "@/components/internal/data-hub/entity-dialog";
import { DeleteConfirmDialog } from "@/components/internal/data-hub/delete-confirm-dialog";
import { buildDataHubQuery, parseDataHubFilters } from "@/lib/data-hub-filters";
import { validateEntityField, validateEntityFields } from "@/lib/entity-field-validation";

type Row = Record<string, unknown> & { id?: string };

type ListPayload = {
  rows: Row[];
  total: number;
  filtered: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
};

function isListPayload(data: unknown): data is ListPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "rows" in data &&
    Array.isArray((data as ListPayload).rows)
  );
}

function resolveDisplayLabels(row: Row | null, fields: FormField[]): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!row) return labels;
  for (const f of fields) {
    if (f.displayFromRow && row[f.displayFromRow] != null) {
      labels[f.key] = String(row[f.displayFromRow]);
    } else if (f.type === "searchable" && f.searchKind === "aircraft" && row.aircraft) {
      labels[f.key] = String(row.aircraft);
    } else if (f.type === "searchable" && f.searchKind === "airport" && row.airportIcao) {
      labels[f.key] = String(row.airportIcao);
    } else if (f.type === "searchable" && f.searchKind === "fbo" && row.fboName) {
      const icao = row.airportIcao ? `${row.airportIcao} — ` : "";
      labels[f.key] = `${icao}${row.fboName}`;
    }
  }
  return labels;
}

export function CrudTab({
  title,
  apiPath,
  columns,
  fields,
  emptyMessage,
  fillHeight = false,
  extraBody,
  onMutate,
  initialData,
  readOnly = false,
  enableCopy = false,
}: {
  title: string;
  apiPath: string;
  tab?: string;
  columns: DataTableColumn<Row>[];
  fields: FormField[];
  emptyMessage?: string;
  fillHeight?: boolean;
  /** Extra fields merged into save body (e.g. assumptions JSON). */
  extraBody?: Record<string, unknown>;
  /** Called after a successful create, update, or delete. */
  onMutate?: () => void;
  /** Server-prefetched list payload to avoid an initial client fetch. */
  initialData?: ListPayload | null;
  /** Hide all mutation controls (Add / Edit / Delete). */
  readOnly?: boolean;
  /** Show a per-row Copy action that POSTs { copyFromId }. */
  enableCopy?: boolean;
}) {
  const searchParams = useSearchParams();
  const filterKey = useMemo(() => {
    const f = parseDataHubFilters(searchParams);
    return buildDataHubQuery(f).toString();
  }, [searchParams]);

  const [rows, setRows] = useState<Row[]>(initialData?.rows ?? []);
  const [totalCount, setTotalCount] = useState(initialData?.total ?? 0);
  const [filteredCount, setFilteredCount] = useState(initialData?.filtered ?? 0);
  const skipInitialLoad = useRef(!!initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [displayLabels, setDisplayLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const f = parseDataHubFilters(searchParams);
    const qs = buildDataHubQuery(f);
    const url = qs.toString() ? `${apiPath}?${qs.toString()}` : apiPath;
    const res = await fetch(url);
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (isListPayload(data)) {
      setRows(data.rows);
      setTotalCount(data.total);
      setFilteredCount(data.filtered);
    } else if (Array.isArray(data)) {
      setRows(data as Row[]);
      setTotalCount(data.length);
      setFilteredCount(data.length);
    }
  }, [apiPath, searchParams]);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load();
  }, [load, filterKey]);

  function openCreate() {
    setEditing(null);
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = "";
    setValues(init);
    setDisplayLabels({});
    setSaveError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const init: Record<string, string> = {};
    for (const f of fields) {
      const v = row[f.key];
      init[f.key] = v != null ? String(v) : "";
    }
    setValues(init);
    setDisplayLabels(resolveDisplayLabels(row, fields));
    setSaveError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function blurField(key: string) {
    const field = fields.find((f) => f.key === key);
    if (!field) return;
    const err = validateEntityField(field, values[key] ?? "");
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  }

  async function save() {
    const errors = validateEntityFields(fields, values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = { ...extraBody };
      for (const f of fields) {
        const v = values[f.key]?.trim();
        if (!v && f.required) {
          setSaveError(`${f.label} is required.`);
          return;
        }
        if (f.type === "number" && v) body[f.key] = parseFloat(v);
        else if (v) body[f.key] = v;
      }

      const url = editing?.id ? `${apiPath}/${editing.id}` : apiPath;
      const res = await fetch(url, {
        method: editing?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(typeof json.error === "string" ? json.error : "Save failed");
        return;
      }
      setOpen(false);
      void load();
      onMutate?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!row.id) return;
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiPath}/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Delete failed");
        return;
      }
      setDeleteTarget(null);
      void load();
      onMutate?.();
    } finally {
      setDeleting(false);
    }
  }

  async function copyRow(row: Row) {
    if (!row.id) return;
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copyFromId: row.id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(typeof json.error === "string" ? json.error : "Copy failed");
      return;
    }
    void load();
    onMutate?.();
  }

  const showCount = totalCount > 0 && filteredCount !== totalCount;

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{title}</h2>
          {showCount && (
            <p className="mt-0.5 text-xs text-atlas-muted">
              Showing {filteredCount} of {totalCount}
            </p>
          )}
        </div>
        {!readOnly && <Button onClick={openCreate}>+ Add</Button>}
      </div>
      <DataTable
        title=""
        rows={rows}
        columns={columns}
        onEdit={readOnly ? undefined : openEdit}
        onDelete={readOnly ? undefined : remove}
        onCopy={enableCopy && !readOnly ? copyRow : undefined}
        emptyMessage={emptyMessage}
        fillHeight={fillHeight}
      />
      <EntityDialog
        open={open}
        title={editing ? `Edit ${title}` : `Add ${title}`}
        fields={fields}
        values={values}
        displayLabels={displayLabels}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onDisplayLabelChange={(k, label) =>
          setDisplayLabels((prev) => ({ ...prev, [k]: label }))
        }
        onClose={() => setOpen(false)}
        onSave={() => void save()}
        saving={saving}
        saveError={saveError}
        fieldErrors={fieldErrors}
        onBlurField={blurField}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        confirming={deleting}
      />
    </div>
  );
}
