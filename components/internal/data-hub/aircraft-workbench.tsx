"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { DeleteConfirmDialog } from "@/components/internal/data-hub/delete-confirm-dialog";
import { AircraftTypeAfmPanel } from "@/components/internal/data-hub/aircraft-type-afm-panel";
import {
  WAREHOUSE_AIRCRAFT_FIELDS,
  getMissingPublishFields,
  type AircraftTypeField,
} from "@/lib/warehouse-aircraft-fields";
import {
  defaultWarehouseFieldVisibility,
  optionalWarehouseFieldKeys,
} from "@/lib/warehouse-aircraft-proforma-visibility";
import { cn, formatFormattedNumber } from "@/lib/utils";
import type { DataHubListPayload } from "@/lib/data-hub-prefetch";
import { ROUTES } from "@/lib/routes";

type Row = Record<string, unknown> & { id?: string; status?: string; code?: string };

/** Shared control styling — matches `components/ui/input.tsx`. */
const FIELD_CONTROL = cn(
  "flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text",
  "placeholder:text-atlas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const TOGGLE_SLOT_W = "w-[5.75rem] shrink-0";

const TYPE_SECTION_NAMES = [
  "General",
  "Hourly Rates",
  "Crew",
  "Utilization",
  "Finances",
  "Operating Costs",
  "Empty Legs",
  "AFM",
] as const;

type TypeSection = (typeof TYPE_SECTION_NAMES)[number];

/** Crew sub-rows: default ladder step, salaries, and training per role. */
const CREW_ROLE_ROWS: { label: string; keys: AircraftTypeField["key"][] }[] = [
  { label: "Minimum crew", keys: ["defaultMinimumCrew"] },
  { label: "Lead Pilot", keys: ["leadPilotSalary", "leadPilotTrainingCost"] },
  { label: "PIC", keys: ["picSalary", "picTrainingCost"] },
  { label: "SIC", keys: ["sicSalary", "sicTrainingCost"] },
  { label: "Cabin Attendant", keys: ["cabinAttendantSalary"] },
];

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function parseVisibility(raw: unknown): Record<string, boolean> {
  const defaults = defaultWarehouseFieldVisibility();
  if (!raw || typeof raw !== "object") return defaults;
  for (const key of optionalWarehouseFieldKeys()) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "boolean") defaults[key] = v;
  }
  return defaults;
}

function WorkbenchSelect({
  id,
  value,
  onChange,
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CONTROL}>
      {children}
    </select>
  );
}

function FieldToggle({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cn(
        TOGGLE_SLOT_W,
        "flex h-7 items-center justify-end gap-0.5 rounded-md border border-atlas-border/70 bg-atlas-bg/80 p-0.5 text-[11px]"
      )}
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 rounded px-1.5 py-0.5 transition-colors",
          visible ? "bg-atlas-accent/20 font-medium text-atlas-accent" : "text-atlas-muted hover:text-atlas-text"
        )}
      >
        Show
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 rounded px-1.5 py-0.5 transition-colors",
          !visible ? "bg-atlas-border/60 font-medium text-atlas-text" : "text-atlas-muted hover:text-atlas-text"
        )}
      >
        Hide
      </button>
    </div>
  );
}

function AircraftFieldInput({
  field,
  value,
  onChange,
  dimmed,
}: {
  field: AircraftTypeField;
  value: string;
  onChange: (v: string) => void;
  dimmed?: boolean;
}) {
  const controlClass = cn(FIELD_CONTROL, dimmed && "opacity-60");

  if (field.type === "select" || field.type === "bool") {
    return (
      <WorkbenchSelect id={field.key} value={value} onChange={onChange}>
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </WorkbenchSelect>
    );
  }

  if (field.format === "money") {
    return (
      <MoneyInput
        id={field.key}
        value={value}
        onChange={onChange}
        className={cn(controlClass, "tabular-nums")}
        placeholder="0"
      />
    );
  }

  if (field.format === "integer" || field.type === "int") {
    return (
      <input
        id={field.key}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ? formatFormattedNumber(value) : ""}
        placeholder="0"
        className={cn(controlClass, "tabular-nums")}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
      />
    );
  }

  return (
    <input
      id={field.key}
      type="text"
      autoComplete="off"
      value={value}
      className={controlClass}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FieldCell({
  field,
  value,
  visibility,
  onValueChange,
  onVisibilityChange,
}: {
  field: AircraftTypeField;
  value: string;
  visibility: Record<string, boolean>;
  onValueChange: (v: string) => void;
  onVisibilityChange: (show: boolean) => void;
}) {
  const showToggle = field.proformaToggleable === true;
  const hiddenOnProForma = showToggle && visibility[field.key] === false;
  const missing = field.required && !value.trim();

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        field.key === "displayName" && "sm:col-span-2 xl:col-span-3",
        hiddenOnProForma && "rounded-md ring-1 ring-atlas-border/40 ring-inset"
      )}
    >
      <div className="flex min-h-7 items-start justify-between gap-3">
        <label htmlFor={field.key} className="min-w-0 pt-1 text-sm leading-snug text-atlas-text">
          {field.label}
          {field.required ? <span className="text-atlas-danger"> *</span> : null}
        </label>
        {showToggle ? (
          <FieldToggle
            visible={visibility[field.key] !== false}
            onChange={onVisibilityChange}
          />
        ) : null}
      </div>
      <AircraftFieldInput
        field={field}
        value={value}
        onChange={onValueChange}
        dimmed={hiddenOnProForma}
      />
      {missing ? (
        <p className="text-[11px] text-atlas-danger">Required to publish</p>
      ) : hiddenOnProForma ? (
        <p className="text-[11px] text-atlas-muted">Hidden on pro forma</p>
      ) : null}
    </div>
  );
}

function CrewFieldGrid({
  fields,
  values,
  visibility,
  onValueChange,
  onVisibilityChange,
}: {
  fields: AircraftTypeField[];
  values: Record<string, string>;
  visibility: Record<string, boolean>;
  onValueChange: (key: string, v: string) => void;
  onVisibilityChange: (key: string, show: boolean) => void;
}) {
  const fieldByKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  return (
    <div className="flex flex-col gap-6">
      {CREW_ROLE_ROWS.map((row) => (
        <div key={row.label}>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-atlas-muted/90">
            {row.label}
          </h4>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {row.keys.map((key) => {
              const field = fieldByKey.get(key);
              if (!field) return null;
              return (
                <FieldCell
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  visibility={visibility}
                  onValueChange={(v) => onValueChange(field.key, v)}
                  onVisibilityChange={(show) => onVisibilityChange(field.key, show)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeTypeSection(raw: string | null): TypeSection {
  if (!raw) return "General";
  if (raw === "AFM" || raw === "AFM / Performance" || raw.toLowerCase() === "afm") return "AFM";
  const match = TYPE_SECTION_NAMES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return match ?? "General";
}


export function AircraftWorkbench({
  initialData,
}: {
  initialData?: DataHubListPayload | null;
}) {
  const apiPath = "/api/data/aircraft";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>(initialData?.rows ?? []);
  const skipInitialLoad = useRef(!!initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    defaultWarehouseFieldVisibility
  );
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [search, setSearch] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "published">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typeSection, setTypeSection] = useState<TypeSection>("General");
  const appliedFocus = useRef(false);

  const syncUrl = useCallback(
    (opts: {
      typeId?: string | null;
      section?: string | null;
      clearEntity?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "aircraft");
      params.delete("tailId");
      if (opts.clearEntity) {
        params.delete("typeId");
        params.delete("section");
      } else if (opts.typeId) {
        params.set("typeId", opts.typeId);
        if (opts.section) params.set("section", opts.section);
      }
      if (opts.section && !opts.clearEntity) params.set("section", opts.section);
      router.replace(`${ROUTES.dataWarehouse.data}?${params.toString()}`);
    },
    [router, searchParams]
  );

  function selectRow(row: Row, section?: TypeSection) {
    setCreating(false);
    setSelectedId(row.id ?? null);
    setStatus(row.status === "published" ? "published" : "draft");
    const next: Record<string, string> = {};
    for (const f of WAREHOUSE_AIRCRAFT_FIELDS) next[f.key] = toStr(row[f.key]);
    setValues(next);
    setVisibility(parseVisibility(row.proformaFieldVisibility));
    setError(null);
    const sec = section ?? typeSection;
    setTypeSection(sec);
    if (row.id) syncUrl({ typeId: row.id, section: sec });
  }

  const load = useCallback(async (selectAfterId?: string) => {
    const res = await fetch(`${apiPath}?limit=500`);
    if (!res.ok) return;
    const data = await res.json();
    const nextRows = Array.isArray(data?.rows) ? (data.rows as Row[]) : [];
    setRows(nextRows);
    if (selectAfterId) {
      const found = nextRows.find((r) => r.id === selectAfterId);
      if (found) selectRow(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load();
  }, [load]);

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setStatus("draft");
    const next: Record<string, string> = {};
    for (const f of WAREHOUSE_AIRCRAFT_FIELDS) next[f.key] = "";
    next.wifi = "true";
    setValues(next);
    setVisibility(defaultWarehouseFieldVisibility());
    setTypeSection("General");
    setError(null);
    syncUrl({ clearEntity: true, section: "General" });
  }

  useEffect(() => {
    if (appliedFocus.current) return;
    const typeId = searchParams.get("typeId");
    const section = searchParams.get("section");
    if (!typeId) return;
    if (rows.length === 0) return;
    appliedFocus.current = true;
    const found = rows.find((r) => r.id === typeId);
    if (found) selectRow(found, normalizeTypeSection(section));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchParams]);

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const m = toStr(r.manufacturer).trim();
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (manufacturerFilter && toStr(r.manufacturer) !== manufacturerFilter) return false;
      if (!q) return true;
      return ["displayName", "manufacturer", "model", "modelCode", "code"].some((k) =>
        toStr(r[k]).toLowerCase().includes(q)
      );
    });
  }, [rows, search, manufacturerFilter, statusFilter]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, AircraftTypeField[]>();
    for (const f of WAREHOUSE_AIRCRAFT_FIELDS) {
      if (!byGroup.has(f.group)) {
        byGroup.set(f.group, []);
        order.push(f.group);
      }
      byGroup.get(f.group)!.push(f);
    }
    return order.map((name) => ({ name, fields: byGroup.get(name)! }));
  }, []);

  const activeGroup = groups.find((g) => g.name === typeSection);
  const missingPublish = useMemo(() => getMissingPublishFields(values), [values]);
  const canPublish = missingPublish.length === 0;

  async function persist(saveAs: "draft" | "publish") {
    if (!values.displayName?.trim()) {
      setError("Display Name is required to save.");
      return;
    }
    if (saveAs === "publish" && !canPublish) {
      setError(`Complete required fields: ${missingPublish.map((f) => f.label).join(", ")}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        saveAs,
        proformaFieldVisibility: visibility,
      };
      for (const f of WAREHOUSE_AIRCRAFT_FIELDS) {
        body[f.key] = values[f.key] ?? "";
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
      setStatus(saveAs === "publish" ? "published" : "draft");
      const id = (json as Row).id ?? selectedId ?? undefined;
      await load(id);
      if (id) syncUrl({ typeId: id, section: typeSection });
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
      syncUrl({ clearEntity: true });
      await load();
    } finally {
      setDeleting(false);
    }
  }

  const editing = creating || selectedId != null;
  const heading = creating
    ? "New aircraft type"
    : values.displayName?.trim() || "Edit aircraft type";

  function changeTypeSection(sec: TypeSection) {
    setTypeSection(sec);
    if (selectedId) syncUrl({ typeId: selectedId, section: sec });
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="data-hub-sidebar flex min-h-0 w-72 shrink-0 flex-col border-r border-atlas-border bg-atlas-chrome/95 xl:w-80">
        <div className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3">
          <input
            placeholder="Search types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={FIELD_CONTROL}
          />
          <WorkbenchSelect value={manufacturerFilter} onChange={setManufacturerFilter}>
            <option value="">All manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </WorkbenchSelect>
          <WorkbenchSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "" | "draft" | "published")}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </WorkbenchSelect>
          <Button className="w-full" onClick={startCreate}>
            + Add type
          </Button>
        </div>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {visibleRows.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">No types found.</p>
          ) : (
            <nav className="space-y-0.5" aria-label="Aircraft types">
              {visibleRows.map((row) => {
                const active = !creating && row.id === selectedId;
                const isDraft = row.status !== "published";
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectRow(row)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                        : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {[row.manufacturer, row.model].filter(Boolean).join(" ") || "Untitled"}
                    </span>
                    {toStr(row.code) ? (
                      <span className="shrink-0 font-mono text-[10px] text-atlas-muted">
                        {toStr(row.code)}
                      </span>
                    ) : null}
                    {isDraft ? (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600">
                        Draft
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
            Select a type from the list, or add a new one.
          </div>
        ) : (
          <>
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-atlas-border bg-atlas-surface/10 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-serif text-lg font-medium sm:text-xl">{heading}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      status === "published"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-atlas-muted">
                  {status === "published"
                    ? "Available in proposals when selected."
                    : "Save incomplete records as draft, then publish when all required fields are filled."}
                </p>
              </div>
              {selectedId ? (
                <Button variant="secondary" onClick={() => void copy()} disabled={saving}>
                  Copy
                </Button>
              ) : null}
            </header>

            <nav
              className="atlas-scroll-x flex shrink-0 gap-1 overflow-x-auto border-b border-atlas-border px-4 py-2 sm:px-5"
              aria-label="Type sections"
            >
              {TYPE_SECTION_NAMES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeTypeSection(s)}
                  className={cn(
                    "shrink-0 rounded px-3 py-1.5 text-sm transition-colors",
                    typeSection === s
                      ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                      : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                  )}
                >
                  {s === "AFM" ? "AFM / Performance" : s}
                </button>
              ))}
            </nav>

            {typeSection !== "AFM" ? (
              <div className="shrink-0 border-b border-atlas-border/60 bg-atlas-surface/15 px-5 py-3 text-xs leading-relaxed text-atlas-muted">
                Parts/engine/APU programs, inspection reserve, trip expense hourly, and cabin attendant
                fields include a{" "}
                <span className={cn(TOGGLE_SLOT_W, "inline-flex h-5 align-middle")}>
                  <span className="flex h-full w-full items-center justify-center rounded border border-atlas-border/60 bg-atlas-bg/80 text-[10px]">
                    Show / Hide
                  </span>
                </span>{" "}
                control — Hide excludes that value from the pro forma (default is Show). All other
                fields are required to publish.
              </div>
            ) : null}

            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="mx-auto flex max-w-5xl flex-col gap-5">
                {typeSection === "AFM" ? (
                  selectedId ? (
                    <AircraftTypeAfmPanel aircraftTypeId={selectedId} />
                  ) : (
                    <p className="text-sm text-atlas-muted">
                      Save this type first, then upload AFM performance grids.
                    </p>
                  )
                ) : activeGroup ? (
                  <section className="rounded-lg border border-atlas-border/80 bg-atlas-surface/20 p-4 sm:p-5">
                    <h3 className="mb-4 border-b border-atlas-border/50 pb-2 text-sm font-semibold uppercase tracking-wide text-atlas-muted">
                      {activeGroup.name}
                    </h3>
                    {activeGroup.name === "Crew" ? (
                      <CrewFieldGrid
                        fields={activeGroup.fields}
                        values={values}
                        visibility={visibility}
                        onValueChange={(key, v) => setValues((p) => ({ ...p, [key]: v }))}
                        onVisibilityChange={(key, show) =>
                          setVisibility((prev) => ({ ...prev, [key]: show }))
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                        {activeGroup.fields.map((f) => (
                          <FieldCell
                            key={f.key}
                            field={f}
                            value={values[f.key] ?? ""}
                            visibility={visibility}
                            onValueChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
                            onVisibilityChange={(show) =>
                              setVisibility((prev) => ({ ...prev, [f.key]: show }))
                            }
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            </div>

            {typeSection !== "AFM" ? (
              <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-atlas-border bg-atlas-surface/10 px-5 py-3">
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
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {error ? <p className="text-sm text-atlas-danger">{error}</p> : null}
                  {!canPublish && editing ? (
                    <p className="hidden text-xs text-atlas-muted sm:block">
                      {missingPublish.length} required field
                      {missingPublish.length === 1 ? "" : "s"} remaining to publish
                    </p>
                  ) : null}
                  <Button variant="secondary" onClick={() => void persist("draft")} disabled={saving}>
                    {saving ? "Saving…" : "Save draft"}
                  </Button>
                  <Button onClick={() => void persist("publish")} disabled={saving || !canPublish}>
                    {saving ? "Saving…" : "Publish"}
                  </Button>
                </div>
              </footer>
            ) : null}
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
