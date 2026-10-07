"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { lineSource, SECTION_TAB } from "@/lib/aircraft-type-line-sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/internal/data-hub/delete-confirm-dialog";
import { DATA_HUB_SIDEBAR_CLASS } from "@/components/internal/data-hub/sidebar-class";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import type { LineItemWire } from "@/lib/line-item-api";
import type { LineItemAppliesTo, LineItemKind, LineItemSection } from "@/lib/line-item-catalog";

const API = "/api/data/line-items";

const SECTIONS: { id: LineItemSection; label: string; hint: string }[] = [
  { id: "revenue", label: "Revenue", hint: "Charter types only. Hourly × charter revenue hours, or a flat annual amount." },
  { id: "fixed", label: "Fixed Ownership Costs", hint: "A flat annual cost." },
  { id: "variable", label: "Variable Costs", hint: "Hourly rate × flight hours (owner, charter, or both)." },
];

const APPLIES_LABEL: Record<LineItemAppliesTo, string> = {
  both: "Owner + charter hours",
  owner: "Owner hours only",
  charter: "Charter hours only",
};

type Draft = {
  key: string | null;
  label: string;
  section: LineItemSection;
  kind: LineItemKind;
  appliesTo: LineItemAppliesTo;
  active: boolean;
  sortOrder: number;
};

function draftFrom(item: LineItemWire): Draft {
  return {
    key: item.key,
    label: item.label,
    section: item.section,
    kind: item.kind,
    appliesTo: item.appliesTo ?? "both",
    active: item.active,
    sortOrder: item.sortOrder,
  };
}

function unitLabel(item: Pick<Draft, "section" | "kind">): string {
  if (item.section === "fixed") return "$/yr";
  if (item.section === "variable") return "$/hr";
  return item.kind === "hourly" ? "$/hr" : "$/yr";
}

export function LineItemWorkbench() {
  const [items, setItems] = useState<LineItemWire[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (selectKey?: string) => {
    const res = await fetch(API);
    if (!res.ok) return;
    const data = await res.json();
    const rows: LineItemWire[] = Array.isArray(data?.rows) ? data.rows : [];
    setItems(rows);
    if (selectKey) {
      const found = rows.find((r) => r.key === selectKey);
      if (found) setDraft(draftFrom(found));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = draft?.key ? items.find((i) => i.key === draft.key) ?? null : null;
  const builtIn = selected?.builtIn ?? false;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Calculated and FBO-derived lines (crew, hangar, fuel, debt service, …) are built into the
    // pro forma, not values anyone enters per aircraft type, so they aren't listed here.
    const listed = items.filter((i) => {
      const src = lineSource(i);
      return src.kind === "set_here" || (src.kind === "company" && !!src.overrideLine);
    });
    const visible = q ? listed.filter((i) => i.label.toLowerCase().includes(q)) : listed;
    return SECTIONS.map((s) => ({ ...s, items: visible.filter((i) => i.section === s.id) }));
  }, [items, search]);

  function patch(p: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setMessage(null);
  }

  async function save() {
    if (!draft) return;
    if (!draft.label.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const creating = !draft.key;
      const res = await fetch(creating ? API : `${API}/${draft.key}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          creating
            ? { label: draft.label.trim(), section: draft.section, kind: draft.kind, appliesTo: draft.appliesTo }
            : {
                label: draft.label.trim(),
                active: draft.active,
                sortOrder: draft.sortOrder,
                ...(builtIn ? {} : { kind: draft.kind, appliesTo: draft.appliesTo }),
              }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed");
        return;
      }
      await load(json.key ?? draft.key ?? undefined);
      setMessage(
        creating
          ? `Created. Set its value per aircraft type in Aircraft types → ${SECTION_TAB[draft.section]}.`
          : "Saved. Proposals pick this up when their aircraft is added or refreshed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!draft?.key) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/${draft.key}`, { method: "DELETE" });
      if (res.ok) {
        setDraft(null);
        setDeleteOpen(false);
        await load();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className={DATA_HUB_SIDEBAR_CLASS}>
        <div className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3">
          <Input placeholder="Search line items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              setDraft({ key: null, label: "", section: "fixed", kind: "annual", appliesTo: "both", active: true, sortOrder: 0 });
              setError(null);
              setMessage(null);
            }}
          >
            + Add line item
          </Button>
        </div>
        <nav className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Line items">
          {grouped.map((group) => (
            <div key={group.id} className="mb-3">
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setDraft(draftFrom(item));
                    setError(null);
                    setMessage(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm transition-colors",
                    draft?.key === item.key
                      ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                      : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text",
                    !item.active && "opacity-50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-atlas-muted">{unitLabel(item)}</span>
                  {!item.builtIn ? (
                    <span className="shrink-0 rounded bg-atlas-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-atlas-accent">
                      Custom
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <p className="shrink-0 border-t border-atlas-border px-4 py-3 text-xs leading-relaxed text-atlas-muted">
          Calculated lines (crew, hangar, fuel, debt service, charter revenue) are built into the pro
          forma and aren&rsquo;t listed here. Their sources are shown on each aircraft type.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!draft ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-muted">
            Select a line item, or add a new one. Line items define the rows on every pro forma;
            their values are set per aircraft type.
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-atlas-border px-4 py-3">
              <h2 className="truncate font-serif text-lg font-medium sm:text-xl">
                {draft.key ? draft.label || "Untitled line item" : "New line item"}
              </h2>
              <p className="mt-0.5 text-sm text-atlas-muted">
                {selected?.calculatedFrom
                  ? `Company default: ${selected.calculatedFrom}. Aircraft types can optionally override it.`
                  : builtIn
                    ? `Value set per aircraft type (Aircraft types → ${SECTION_TAB[draft.section]}).`
                    : draft.key
                      ? `Custom · value set on ${selected?.valueCount ?? 0} aircraft type${selected?.valueCount === 1 ? "" : "s"}`
                      : "Custom line item"}
              </p>
            </header>

            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto p-4">
              <div className="max-w-xl space-y-4">
                <div>
                  <label htmlFor="li-name" className="mb-1 block text-xs text-atlas-muted">
                    Name *
                  </label>
                  <Input id="li-name" value={draft.label} onChange={(e) => patch({ label: e.target.value })} />
                </div>

                <fieldset disabled={!!draft.key} className="disabled:opacity-60">
                  <legend className="mb-1 text-xs text-atlas-muted">
                    Section{draft.key ? " (fixed once created)" : ""}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Section">
                    {SECTIONS.map((s) => (
                      <label
                        key={s.id}
                        className={cn(
                          "cursor-pointer rounded border px-3 py-2 text-sm",
                          draft.section === s.id ? "border-atlas-accent bg-atlas-accent/10" : "border-atlas-border/60"
                        )}
                      >
                        <input
                          type="radio"
                          name="li-section"
                          className="sr-only"
                          checked={draft.section === s.id}
                          onChange={() =>
                            patch({ section: s.id, kind: s.id === "fixed" ? "annual" : s.id === "variable" ? "hourly" : draft.kind })
                          }
                        />
                        <span className="block font-medium text-atlas-text">{s.label}</span>
                        <span className="block text-xs text-atlas-muted">{s.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {draft.section === "revenue" && !builtIn ? (
                  <div>
                    <label htmlFor="li-kind" className="mb-1 block text-xs text-atlas-muted">
                      Amount
                    </label>
                    <select
                      id="li-kind"
                      value={draft.kind}
                      onChange={(e) => patch({ kind: e.target.value as LineItemKind })}
                      className="atlas-input h-10 w-full text-sm"
                    >
                      <option value="hourly">$/hr × charter revenue hours</option>
                      <option value="annual">Flat $/yr</option>
                    </select>
                  </div>
                ) : null}

                {draft.section === "variable" && !builtIn ? (
                  <div>
                    <label htmlFor="li-applies" className="mb-1 block text-xs text-atlas-muted">
                      Applies to
                    </label>
                    <select
                      id="li-applies"
                      value={draft.appliesTo}
                      onChange={(e) => patch({ appliesTo: e.target.value as LineItemAppliesTo })}
                      className="atlas-input h-10 w-full text-sm"
                    >
                      {(Object.keys(APPLIES_LABEL) as LineItemAppliesTo[]).map((k) => (
                        <option key={k} value={k}>
                          {APPLIES_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {draft.key ? (
                  <>
                    <div>
                      <label htmlFor="li-sort" className="mb-1 block text-xs text-atlas-muted">
                        Sort order
                      </label>
                      <Input
                        id="li-sort"
                        type="number"
                        value={String(draft.sortOrder)}
                        onChange={(e) => patch({ sortOrder: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded border border-atlas-border/60 bg-atlas-surface/20 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) => patch({ active: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-atlas-accent"
                      />
                      <span>
                        <span className="block text-sm font-medium text-atlas-text">Active</span>
                        <span className="block text-xs text-atlas-muted">
                          Off removes this line from new and refreshed pro formas (it no longer counts in totals).
                        </span>
                      </span>
                    </label>
                  </>
                ) : null}

                {draft.key && !builtIn ? (
                  <p className="text-xs text-atlas-muted">
                    Set values in{" "}
                    <a href={`${ROUTES.dataWarehouse.data}?tab=aircraft&section=${encodeURIComponent(SECTION_TAB[draft.section])}`} className="text-atlas-accent hover:underline">
                      Aircraft types → {SECTION_TAB[draft.section]}
                    </a>
                    . Staff can adjust the value per proposal.
                  </p>
                ) : null}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-atlas-border px-4 py-3">
              <div>
                {draft.key && !builtIn ? (
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
                {message ? <p className="text-sm text-atlas-muted">{message}</p> : null}
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : draft.key ? "Save" : "Create"}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        title="Delete line item?"
        description="Removes it and its values on every aircraft type. Existing proposals keep their copy until refreshed."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        confirming={deleting}
      />
    </div>
  );
}
