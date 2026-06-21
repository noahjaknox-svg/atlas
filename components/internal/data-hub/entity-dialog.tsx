"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";

export type SearchKind = "airport" | "aircraft" | "fbo";

export type FormField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "searchable" | "date";
  searchKind?: SearchKind;
  /** When set, FBO search is filtered by this field's value (airport UUID). */
  searchDependsOn?: string;
  /** Row key used to pre-fill searchable display label on edit. */
  displayFromRow?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

function EntitySearchField({
  field,
  value,
  displayValue,
  dependsOnValue,
  onChange,
}: {
  field: FormField;
  value: string;
  displayValue: string;
  dependsOnValue?: string;
  onChange: (id: string, label: string) => void;
}) {
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (query: string) => {
      if (field.searchKind === "fbo" && field.searchDependsOn && !dependsOnValue) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        let url = "";
        if (field.searchKind === "airport") {
          url = `/api/airports/search?q=${encodeURIComponent(query)}`;
        } else if (field.searchKind === "aircraft") {
          url = `/api/aircraft-master/search?q=${encodeURIComponent(query)}`;
        } else if (field.searchKind === "fbo") {
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (dependsOnValue) params.set("airportId", dependsOnValue);
          url = `/api/fbos/search?${params.toString()}`;
        }
        if (!url) return;
        const res = await fetch(url);
        if (!res.ok) return;
        const rows = (await res.json()) as Array<{ id: string; label?: string; icao?: string; airportName?: string; city?: string | null }>;
        setOptions(
          rows.map((r) => ({
            id: field.searchKind === "airport" ? (r.icao ?? r.id) : r.id,
            label:
              r.label ??
              (field.searchKind === "airport"
                ? `${r.icao ?? r.id} — ${r.airportName ?? ""}${r.city ? `, ${r.city}` : ""}`
                : r.id),
          }))
        );
      } finally {
        setLoading(false);
      }
    },
    [field.searchKind, field.searchDependsOn, dependsOnValue]
  );

  useEffect(() => {
    if (value && displayValue) return;
    if (field.searchKind === "fbo" && dependsOnValue) {
      void search("");
    }
  }, [value, displayValue, field.searchKind, dependsOnValue, search]);

  return (
    <SearchableSelect
      label={field.label + (field.required ? " *" : "")}
      placeholder={
        field.searchKind === "fbo" && field.searchDependsOn && !dependsOnValue
          ? "Select an airport first"
          : field.placeholder ?? "Type to search…"
      }
      value={value}
      displayValue={displayValue}
      options={options}
      loading={loading}
      onSearch={(q) => void search(q)}
      onSelect={(opt) => onChange(opt?.id ?? "", opt?.label ?? "")}
      disabled={field.searchKind === "fbo" && !!field.searchDependsOn && !dependsOnValue}
      compact
    />
  );
}

export function EntityDialog({
  open,
  title,
  fields,
  values,
  displayLabels,
  onChange,
  onDisplayLabelChange,
  onClose,
  onSave,
  saving,
  saveError,
  fieldErrors,
  onBlurField,
  footer,
}: {
  open: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, string>;
  displayLabels: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onDisplayLabelChange: (key: string, label: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveError?: string | null;
  fieldErrors?: Record<string, string>;
  onBlurField?: (key: string) => void;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-atlas-border bg-atlas-bg p-6 shadow-xl">
          <Dialog.Title className="font-medium text-lg">{title}</Dialog.Title>
          <div className="mt-4 grid gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                {f.type === "searchable" && f.searchKind ? (
                  <EntitySearchField
                    field={f}
                    value={values[f.key] ?? ""}
                    displayValue={displayLabels[f.key] ?? ""}
                    dependsOnValue={
                      f.searchDependsOn ? values[f.searchDependsOn] : undefined
                    }
                    onChange={(id, label) => {
                      onChange(f.key, id);
                      onDisplayLabelChange(f.key, label);
                    }}
                  />
                ) : (
                  <>
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </Label>
                    {f.type === "select" && f.options ? (
                      <select
                        id={f.key}
                        value={values[f.key] ?? ""}
                        onChange={(e) => onChange(f.key, e.target.value)}
                        className="mt-1 h-10 w-full rounded border border-atlas-border bg-atlas-surface px-3 text-sm"
                      >
                        <option value="">{f.placeholder ?? "Select…"}</option>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        id={f.key}
                        value={values[f.key] ?? ""}
                        onChange={(e) => onChange(f.key, e.target.value)}
                        rows={3}
                        placeholder={f.placeholder}
                        className="mt-1 w-full rounded border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
                      />
                    ) : (
                      <Input
                        id={f.key}
                        type={
                          f.type === "number"
                            ? "number"
                            : f.type === "date"
                              ? "date"
                              : "text"
                        }
                        value={values[f.key] ?? ""}
                        onChange={(e) => onChange(f.key, e.target.value)}
                        onBlur={() => onBlurField?.(f.key)}
                        placeholder={f.placeholder}
                        className="mt-1"
                      />
                    )}
                    {fieldErrors?.[f.key] ? (
                      <p className="mt-1 text-xs text-atlas-danger">{fieldErrors[f.key]}</p>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
          {footer}
          {saveError ? (
            <p className="mt-3 text-sm text-atlas-danger">{saveError}</p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
