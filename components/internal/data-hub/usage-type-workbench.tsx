"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/internal/data-hub/delete-confirm-dialog";
import { DATA_HUB_SIDEBAR_CLASS } from "@/components/internal/data-hub/sidebar-class";
import { cn } from "@/lib/utils";
import type { LineItemWire } from "@/lib/line-item-api";
import {
  defaultUsageTypeConfig,
  lineSetting,
  parseUsageTypeConfig,
  usageTypeLineGroups,
  type UsageTypeConfig,
  type UsageTypeLineSetting,
} from "@/lib/usage-type-config";

const API = "/api/data/usage-types";
const SECTIONS = ["General", "Pro forma lines", "Portal pages"] as const;
type Section = (typeof SECTIONS)[number];

type UsageTypeRow = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  charterEnabled: boolean;
  config: UsageTypeConfig;
};

type Draft = Omit<UsageTypeRow, "id"> & { id: string | null };

type PortalPage = { slug: string; title: string; visible: boolean; applies: boolean; appliesToAll: boolean };

function emptyDraft(): Draft {
  return { id: null, name: "", sortOrder: 0, active: true, charterEnabled: false, config: defaultUsageTypeConfig() };
}

function Check({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-atlas-accent disabled:opacity-40"
    />
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-atlas-border/60 bg-atlas-surface/20 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-atlas-accent"
      />
      <span>
        <span className="block text-sm font-medium text-atlas-text">{label}</span>
        <span className="block text-xs text-atlas-muted">{hint}</span>
      </span>
    </label>
  );
}

export function UsageTypeWorkbench() {
  const [rows, setRows] = useState<UsageTypeRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [section, setSection] = useState<Section>("General");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pages, setPages] = useState<PortalPage[] | null>(null);
  // Lines come from the Line Items catalog, so custom items get settings too.
  const [catalog, setCatalog] = useState<LineItemWire[] | null>(null);
  const lineGroups = useMemo(() => usageTypeLineGroups(catalog ?? undefined), [catalog]);

  useEffect(() => {
    void fetch("/api/data/line-items")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rows?: LineItemWire[] } | null) => setCatalog(data?.rows ?? null))
      .catch(() => {});
  }, []);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async (selectId?: string) => {
    const res = await fetch(`${API}?limit=500`);
    if (!res.ok) return;
    const data = await res.json();
    const next: UsageTypeRow[] = (Array.isArray(data?.rows) ? data.rows : []).map(
      (r: UsageTypeRow) => ({ ...r, config: parseUsageTypeConfig(r.config) })
    );
    setRows(next);
    if (selectId) {
      const found = next.find((r) => r.id === selectId);
      if (found) setDraft({ ...found });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPages = useCallback(async (id: string) => {
    setPages(null);
    setPageError(null);
    const res = await fetch(`${API}/${id}/pages`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.pages)) setPages(data.pages);
    else setPageError(typeof data.error === "string" ? data.error : "Could not load pages.");
  }, []);

  useEffect(() => {
    if (section === "Portal pages" && draft?.id) void loadPages(draft.id);
  }, [section, draft?.id, loadPages]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  function select(row: UsageTypeRow) {
    setDraft({ ...row });
    setError(null);
    setMessage(null);
  }

  function patch(p: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setMessage(null);
  }

  function setLine(key: string, next: Partial<UsageTypeLineSetting>) {
    setDraft((d) => {
      if (!d) return d;
      const current = lineSetting(d.config, key);
      const merged = { ...current, ...next };
      return { ...d, config: { ...d.config, lines: { ...d.config.lines, [key]: merged } } };
    });
    setMessage(null);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(draft.id ? `${API}/${draft.id}` : API, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          sortOrder: draft.sortOrder,
          active: draft.active,
          charterEnabled: draft.charterEnabled,
          config: draft.config,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed");
        return;
      }
      await load(json.id ?? draft.id ?? undefined);
      setMessage("Saved. Applies to aircraft when their usage type is next set.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!draft?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/${draft.id}`, { method: "DELETE" });
      if (res.ok) {
        setDraft(null);
        setDeleteOpen(false);
        await load();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function togglePage(slug: string, applies: boolean) {
    if (!draft?.id) return;
    setPageError(null);
    const previous = pages;
    // Update right away; reconcile with the server (or revert) after.
    setPages((ps) => ps?.map((p) => (p.slug === slug ? { ...p, applies, appliesToAll: false } : p)) ?? ps);
    const res = await fetch(`${API}/${draft.id}/pages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, applies }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPages(previous);
      setPageError(typeof json.error === "string" ? json.error : "Could not update page.");
      return;
    }
    const ids: string[] = Array.isArray(json.usageTypeIds) ? json.usageTypeIds : [];
    setPages((ps) => ps?.map((p) => (p.slug === slug ? { ...p, appliesToAll: ids.length === 0 } : p)) ?? ps);
  }

  const charterOff = draft ? !draft.charterEnabled : false;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className={DATA_HUB_SIDEBAR_CLASS}>
        <div className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3">
          <Input placeholder="Search usage type…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              setDraft(emptyDraft());
              setSection("General");
              setError(null);
              setMessage(null);
            }}
          >
            + Add usage type
          </Button>
        </div>
        <nav className="atlas-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Usage types">
          {visibleRows.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">No usage types found.</p>
          ) : (
            visibleRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => select(row)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors",
                  draft?.id === row.id
                    ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                    : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                {row.charterEnabled ? (
                  <span className="shrink-0 rounded bg-atlas-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-atlas-accent">
                    Charter
                  </span>
                ) : null}
                {!row.active ? (
                  <span className="shrink-0 rounded bg-atlas-border/40 px-1.5 py-0.5 text-[10px] uppercase text-atlas-muted">
                    Inactive
                  </span>
                ) : null}
              </button>
            ))
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!draft ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-muted">
            Select a usage type from the list, or add a new one.
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-atlas-border px-4 py-3">
              <h2 className="truncate font-serif text-lg font-medium sm:text-xl">
                {draft.id ? draft.name || "Untitled usage type" : "New usage type"}
              </h2>
            </header>
            <nav
              className="atlas-scroll-x flex shrink-0 gap-1 overflow-x-auto border-b border-atlas-border px-4 py-2"
              aria-label="Usage type sections"
            >
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  disabled={s === "Portal pages" && !draft.id}
                  className={cn(
                    "shrink-0 rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-40",
                    section === s
                      ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                      : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                  )}
                >
                  {s}
                </button>
              ))}
            </nav>

            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto p-4">
              {section === "General" ? (
                <div className="max-w-xl space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ut-name" className="mb-1 block text-xs text-atlas-muted">
                        Name *
                      </label>
                      <Input id="ut-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="ut-sort" className="mb-1 block text-xs text-atlas-muted">
                        Sort order
                      </label>
                      <Input
                        id="ut-sort"
                        type="number"
                        value={String(draft.sortOrder)}
                        onChange={(e) => patch({ sortOrder: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                  </div>
                  <SwitchRow
                    label="Active"
                    hint="Staff can pick this usage type for new aircraft."
                    checked={draft.active}
                    onChange={(v) => patch({ active: v })}
                  />
                  <SwitchRow
                    label="Charter enabled"
                    hint="Adds charter hours, charter revenue, and charter variable costs to the pro forma."
                    checked={draft.charterEnabled}
                    onChange={(v) => patch({ charterEnabled: v })}
                  />
                  <SwitchRow
                    label="Show revenue section to clients"
                    hint="Off hides the Revenue section on the client portal. Revenue still counts in the totals."
                    checked={draft.config.showRevenueSection}
                    onChange={(v) => patch({ config: { ...draft.config, showRevenueSection: v } })}
                  />
                </div>
              ) : null}

              {section === "Pro forma lines" ? (
                <div className="max-w-3xl space-y-5">
                  <p className="text-xs leading-relaxed text-atlas-muted">
                    <strong className="text-atlas-text">Include</strong> counts the line in the pro forma math.{" "}
                    <strong className="text-atlas-text">Show client</strong> itemizes it on the client portal;
                    unchecked lines still count in the totals. Applied when an aircraft is given this usage
                    type; staff can still adjust lines per proposal afterward.
                  </p>
                  {lineGroups.map((group) => {
                    const groupDisabled = group.charterOnly && charterOff;
                    const keys = group.lines.filter((l) => !(l.charterOnly && charterOff)).map((l) => l.key);
                    const allIncluded = keys.every((k) => lineSetting(draft.config, k).include);
                    return (
                      <section key={group.id} aria-label={group.label}>
                        <div className="mb-1 flex items-center justify-between border-b border-atlas-border/60 pb-1.5">
                          <h3 className="text-sm font-semibold text-atlas-text">{group.label}</h3>
                          {groupDisabled ? (
                            <span className="text-xs text-atlas-muted">Turn on Charter enabled to use these</span>
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-atlas-accent hover:underline"
                              onClick={() => keys.forEach((k) => setLine(k, { include: !allIncluded }))}
                            >
                              {allIncluded ? "Exclude all" : "Include all"}
                            </button>
                          )}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-atlas-muted">
                              <th className="py-1 text-left font-normal">Line</th>
                              <th className="w-24 py-1 text-center font-normal">Include</th>
                              <th className="w-24 py-1 text-center font-normal">Show client</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.lines.map((line) => {
                              const s = lineSetting(draft.config, line.key);
                              const disabled = groupDisabled || (line.charterOnly && charterOff);
                              return (
                                <tr key={line.key} className={cn("border-t border-atlas-border/30", disabled && "opacity-50")}>
                                  <td className="py-1.5 text-atlas-text">{line.label}</td>
                                  <td className="text-center">
                                    <Check
                                      label={`Include ${group.label} ${line.label}`}
                                      checked={s.include}
                                      disabled={disabled}
                                      onChange={(v) => setLine(line.key, { include: v })}
                                    />
                                  </td>
                                  <td className="text-center">
                                    <Check
                                      label={`Show client ${group.label} ${line.label}`}
                                      checked={s.include && s.showClient}
                                      disabled={disabled || !s.include}
                                      onChange={(v) => setLine(line.key, { showClient: v })}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    );
                  })}
                </div>
              ) : null}

              {section === "Portal pages" ? (
                <div className="max-w-xl space-y-3">
                  <p className="text-xs leading-relaxed text-atlas-muted">
                    Which master portal pages apply to this usage type. Saved immediately; same setting as
                    &ldquo;Usage types&rdquo; on each page in the Portal Designer.
                  </p>
                  {pageError ? <p className="text-sm text-atlas-danger">{pageError}</p> : null}
                  {pages === null ? (
                    <p className="text-sm text-atlas-muted">Loading pages…</p>
                  ) : (
                    <ul className="divide-y divide-atlas-border/40 rounded border border-atlas-border/60" aria-label="Portal pages">
                      {pages.map((p) => (
                        <li key={p.slug} className="flex items-center gap-3 px-3 py-2">
                          <Check
                            label={`Page ${p.title}`}
                            checked={p.applies}
                            onChange={(v) => void togglePage(p.slug, v)}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-atlas-text">{p.title}</span>
                          {p.appliesToAll ? (
                            <span className="text-[10px] uppercase tracking-wide text-atlas-muted">All types</span>
                          ) : null}
                          {!p.visible ? (
                            <span className="text-[10px] uppercase tracking-wide text-atlas-muted">Hidden</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {section !== "Portal pages" ? (
              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-atlas-border px-4 py-3">
                <div>
                  {draft.id ? (
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
                    {saving ? "Saving…" : "Save"}
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
