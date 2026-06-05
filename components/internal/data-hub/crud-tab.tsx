"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/internal/data-hub/data-table";
import { EntityDialog, type FormField } from "@/components/internal/data-hub/entity-dialog";
import { FilterBar } from "@/components/internal/data-hub/filter-bar";
import { buildDataHubQuery, parseDataHubFilters, type FilterField } from "@/lib/data-hub-filters";

type Row = Record<string, unknown> & { id?: string };

type ListPayload = {
  rows: Row[];
  total: number;
  filtered: number;
};

function isListPayload(data: unknown): data is ListPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "rows" in data &&
    Array.isArray((data as ListPayload).rows)
  );
}

export function CrudTab({
  title,
  apiPath,
  tab,
  columns,
  fields,
  filterFields,
  emptyMessage,
}: {
  title: string;
  apiPath: string;
  tab: string;
  columns: DataTableColumn<Row>[];
  fields: FormField[];
  filterFields?: FilterField[];
  emptyMessage?: string;
}) {
  const searchParams = useSearchParams();
  const filterKey = useMemo(() => {
    const f = parseDataHubFilters(searchParams);
    return buildDataHubQuery(f).toString();
  }, [searchParams]);

  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
    void load();
  }, [load, filterKey]);

  function openCreate() {
    setEditing(null);
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = "";
    setValues(init);
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
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.key]?.trim();
        if (!v && f.required) return;
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
        alert(json.error ?? "Save failed");
        return;
      }
      setOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!row.id || !confirm("Delete this record?")) return;
    const res = await fetch(`${apiPath}/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Delete failed");
      return;
    }
    void load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <Button onClick={openCreate}>+ Add</Button>
      </div>
      {filterFields && filterFields.length > 0 && (
        <FilterBar
          tab={tab}
          fields={filterFields}
          filteredCount={filteredCount}
          totalCount={totalCount}
        />
      )}
      <DataTable
        title=""
        rows={rows}
        columns={columns}
        onEdit={openEdit}
        onDelete={remove}
        emptyMessage={emptyMessage}
      />
      <EntityDialog
        open={open}
        title={editing ? `Edit ${title}` : `Add ${title}`}
        fields={fields}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onClose={() => setOpen(false)}
        onSave={() => void save()}
        saving={saving}
      />
    </div>
  );
}
