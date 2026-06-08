"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn } from "@/components/internal/data-hub/data-table";
import { EntityDialog, type FormField } from "@/components/internal/data-hub/entity-dialog";
import { AIRCRAFT_SEARCH_FIELD } from "@/components/internal/data-hub/scenario-fields";
import { buildDataHubQuery, parseDataHubFilters } from "@/lib/data-hub-filters";
import { formatAssumptionsSummary } from "@/lib/assumption-labels";

type Row = Record<string, unknown> & { id?: string };

type AssumptionRow = { assumptionKey: string; value: string };

const BASE_FIELDS: FormField[] = [
  { key: "name", label: "Template name", required: true },
  AIRCRAFT_SEARCH_FIELD,
  { key: "description", label: "Description", type: "textarea" },
];

const COMMON_KEYS = [
  "pic_salary",
  "sic_salary",
  "management_fee",
  "owner_annual_hours",
  "proposed_home_base",
  "crew_model",
  "pic_count",
  "sic_count",
];

export function ScenarioTemplatesTab() {
  const searchParams = useSearchParams();
  const filterKey = useMemo(() => {
    const f = parseDataHubFilters(searchParams);
    return buildDataHubQuery(f).toString();
  }, [searchParams]);

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [displayLabels, setDisplayLabels] = useState<Record<string, string>>({});
  const [assumptions, setAssumptions] = useState<AssumptionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const columns: DataTableColumn<Row>[] = [
    { key: "name", label: "Name" },
    { key: "aircraft", label: "Aircraft" },
    {
      key: "assumptions",
      label: "Overrides",
      render: (row) =>
        formatAssumptionsSummary(
          row.assumptions as Array<{ assumptionKey: string; value: string }> | undefined
        ),
    },
  ];

  const load = useCallback(async () => {
    const f = parseDataHubFilters(searchParams);
    const qs = buildDataHubQuery(f);
    const url = qs.toString()
      ? `/api/data/scenario-templates?${qs.toString()}`
      : "/api/data/scenario-templates";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.rows) setRows(data.rows);
    else if (Array.isArray(data)) setRows(data);
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load, filterKey]);

  function openCreate() {
    setEditing(null);
    setValues({ name: "", aircraftMasterId: "", description: "" });
    setDisplayLabels({});
    setAssumptions([{ assumptionKey: "", value: "" }]);
    setSaveError(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setValues({
      name: String(row.name ?? ""),
      aircraftMasterId: String(row.aircraftMasterId ?? ""),
      description: String(row.description ?? ""),
    });
    setDisplayLabels({ aircraftMasterId: String(row.aircraft ?? "") });
    const a = row.assumptions as AssumptionRow[] | undefined;
    setAssumptions(a?.length ? a.map((x) => ({ ...x })) : [{ assumptionKey: "", value: "" }]);
    setSaveError(null);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      if (!values.name?.trim()) {
        setSaveError("Template name is required.");
        return;
      }
      if (!values.aircraftMasterId?.trim()) {
        setSaveError("Aircraft is required.");
        return;
      }

      const body = {
        name: values.name.trim(),
        aircraftMasterId: values.aircraftMasterId.trim(),
        description: values.description?.trim() || null,
        assumptions: assumptions
          .filter((a) => a.assumptionKey.trim() && a.value.trim())
          .map((a) => ({
            assumptionKey: a.assumptionKey.trim(),
            value: a.value.trim(),
          })),
      };

      const url = editing?.id
        ? `/api/data/scenario-templates/${editing.id}`
        : "/api/data/scenario-templates";
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
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!row.id || !confirm("Delete this scenario template?")) return;
    const res = await fetch(`/api/data/scenario-templates/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Delete failed");
      return;
    }
    void load();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <h2 className="font-medium">Scenario templates</h2>
        <Button onClick={openCreate}>+ Add</Button>
      </div>
      <DataTable
        title=""
        rows={rows}
        columns={columns}
        onEdit={openEdit}
        onDelete={remove}
        fillHeight
      />
      <EntityDialog
        open={open}
        title={editing ? "Edit scenario template" : "Add scenario template"}
        fields={BASE_FIELDS}
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
        footer={
          <div className="mt-4 border-t border-atlas-border pt-4">
            <p className="atlas-kicker mb-2">Assumption overrides</p>
            <div className="space-y-2">
              {assumptions.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <div>
                    {i === 0 ? <Label className="text-xs">Key</Label> : null}
                    <Input
                      list="scenario-assumption-keys"
                      value={a.assumptionKey}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev.map((row, j) =>
                            j === i ? { ...row, assumptionKey: e.target.value } : row
                          )
                        )
                      }
                      placeholder="e.g. pic_salary"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    {i === 0 ? <Label className="text-xs">Value</Label> : null}
                    <Input
                      value={a.value}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev.map((row, j) =>
                            j === i ? { ...row, value: e.target.value } : row
                          )
                        )
                      }
                      placeholder="e.g. 525000"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end text-atlas-danger"
                    onClick={() =>
                      setAssumptions((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <datalist id="scenario-assumption-keys">
              {COMMON_KEYS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() =>
                setAssumptions((prev) => [...prev, { assumptionKey: "", value: "" }])
              }
            >
              + Add override
            </Button>
          </div>
        }
      />
    </div>
  );
}
