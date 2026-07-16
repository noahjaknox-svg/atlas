"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CREW_OPERATING_DEFAULTS,
  CREW_OPERATING_FIELD_META,
  parseOperatingJson,
  type CrewOperatingData,
} from "@/lib/crew/types";
import { cn } from "@/lib/utils";

type TypeOption = { id: string; code: string; manufacturer: string; model: string };

type FleetRow = {
  id: string;
  tailNumber: string;
  aircraftTypeId: string;
  aircraftTypeCode: string;
  status: string;
  homeBase: string | null;
  serialNumber: string | null;
  operating: CrewOperatingData;
};

const FIELD_CONTROL = cn(
  "flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text",
  "placeholder:text-atlas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
);

export type TailSection = "Identity" | "Operating";

export function AircraftTailEditor({
  tailId,
  creating,
  types,
  section,
  onSectionChange,
  onSaved,
  onDeleted,
  onCancelCreate,
}: {
  tailId: string | null;
  creating: boolean;
  types: TypeOption[];
  section: TailSection;
  onSectionChange: (s: TailSection) => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onCancelCreate: () => void;
}) {
  const [form, setForm] = useState({
    tailNumber: "",
    aircraftTypeId: "",
    status: "active",
    homeBase: "",
    serialNumber: "",
    operating: { ...CREW_OPERATING_DEFAULTS },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const resetCreate = useCallback(() => {
    setForm({
      tailNumber: "",
      aircraftTypeId: types[0]?.id ?? "",
      status: "active",
      homeBase: "",
      serialNumber: "",
      operating: { ...CREW_OPERATING_DEFAULTS },
    });
    setError(null);
    setLoadedId(null);
  }, [types]);

  useEffect(() => {
    if (creating) {
      resetCreate();
      return;
    }
    if (!tailId) return;

    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/data/crew-fleet")
      .then((r) => r.json())
      .then((json: { rows?: FleetRow[] }) => {
        if (!active) return;
        const row = (json.rows ?? []).find((r) => r.id === tailId);
        if (!row) {
          setError("Tail not found");
          return;
        }
        setForm({
          tailNumber: row.tailNumber,
          aircraftTypeId: row.aircraftTypeId,
          status: row.status,
          homeBase: row.homeBase ?? "",
          serialNumber: row.serialNumber ?? "",
          operating: parseOperatingJson(row.operating),
        });
        setLoadedId(row.id);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [creating, tailId, resetCreate]);

  async function save() {
    const tailNumber = form.tailNumber.trim();
    if (!tailNumber) {
      setError("Tail number is required.");
      return;
    }
    if (!form.aircraftTypeId) {
      setError("Select an aircraft type.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        tailNumber,
        aircraftTypeId: form.aircraftTypeId,
        status: form.status,
        homeBase: form.homeBase || null,
        serialNumber: form.serialNumber || null,
        operating: form.operating,
      };
      const url = creating || !loadedId ? "/api/data/crew-fleet" : `/api/data/crew-fleet/${loadedId}`;
      const res = await fetch(url, {
        method: creating || !loadedId ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Save failed — check tail number is unique.");
        return;
      }
      onSaved(json.id ?? loadedId ?? "");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!loadedId) return;
    if (!confirm("Delete this tail from the Crew fleet registry?")) return;
    await fetch(`/api/data/crew-fleet/${loadedId}`, { method: "DELETE" });
    onDeleted();
  }

  const sections: TailSection[] = ["Identity", "Operating"];
  const heading = creating
    ? "New tail"
    : form.tailNumber.trim() || "Edit tail";

  if (loading && !creating) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-atlas-muted">
        Loading tail…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-atlas-border bg-atlas-surface/10 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-medium sm:text-xl">{heading}</h2>
          <p className="mt-1 text-xs text-atlas-muted">
            Per-tail operating data ships on Crew <code>/sync</code>. Type owns AFM grids.
          </p>
        </div>
      </header>

      <nav
        className="atlas-scroll-x flex shrink-0 gap-1 overflow-x-auto border-b border-atlas-border px-4 py-2 sm:px-5"
        aria-label="Tail sections"
      >
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSectionChange(s)}
            className={cn(
              "shrink-0 rounded px-3 py-1.5 text-sm transition-colors",
              section === s
                ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
            )}
          >
            {s}
          </button>
        ))}
      </nav>

      <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="mx-auto max-w-5xl">
          {section === "Identity" ? (
            <div className="grid gap-4 rounded-lg border border-atlas-border/80 bg-atlas-surface/20 p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <Label>Tail number</Label>
                <Input
                  value={form.tailNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tailNumber: e.target.value.toUpperCase() }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Aircraft type</Label>
                <select
                  className={cn(FIELD_CONTROL, "mt-1")}
                  value={form.aircraftTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, aircraftTypeId: e.target.value }))}
                >
                  {types.length === 0 ? <option value="">No types available</option> : null}
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code || "—"} — {t.manufacturer} {t.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className={cn(FIELD_CONTROL, "mt-1")}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <Label>Home base (ICAO)</Label>
                <Input
                  value={form.homeBase}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, homeBase: e.target.value.toUpperCase() }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Serial number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 rounded-lg border border-atlas-border/80 bg-atlas-surface/20 p-4 sm:grid-cols-2 sm:p-5">
              {CREW_OPERATING_FIELD_META.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  {field.type === "boolean" ? (
                    <input
                      type="checkbox"
                      className="mt-2"
                      checked={Boolean(form.operating[field.key])}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          operating: { ...f.operating, [field.key]: e.target.checked },
                        }))
                      }
                    />
                  ) : (
                    <Input
                      type="number"
                      className="mt-1 font-mono text-sm"
                      value={String(form.operating[field.key])}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          operating: {
                            ...f.operating,
                            [field.key]: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-atlas-border bg-atlas-surface/10 px-5 py-3">
        <div className="flex gap-2">
          {creating ? (
            <Button variant="ghost" onClick={onCancelCreate}>
              Cancel
            </Button>
          ) : loadedId ? (
            <Button
              variant="ghost"
              onClick={() => void remove()}
              className="text-atlas-danger hover:bg-atlas-danger/10"
            >
              Delete
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {error ? <p className="text-sm text-atlas-danger">{error}</p> : null}
          <Button onClick={() => void save()} disabled={saving || types.length === 0}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
