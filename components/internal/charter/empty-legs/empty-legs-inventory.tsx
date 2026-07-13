"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { jetInsightTripUrl } from "@/lib/charter/empty-legs/eligibility";
import type { EmptyLegRow } from "@/lib/charter/empty-legs/serialize";
import { PricingBreakdownButton } from "@/components/internal/charter/empty-legs/pricing-breakdown-button";
import { EMPTY_LEG_DISPLAY_TIMEZONE } from "@/lib/charter/empty-legs/display-timezone";
import { formatEmptyLegDepartureLabel } from "@/lib/schedule/airport-timezone-format";

type DetailRow = EmptyLegRow & { relatedHistory?: EmptyLegRow[] };

type PublicListOption = {
  id: string;
  name: string;
  isActive: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatDeparture(iso: string, timeZone?: string | null) {
  return formatEmptyLegDepartureLabel(
    iso,
    timeZone && timeZone !== "UTC" ? timeZone : EMPTY_LEG_DISPLAY_TIMEZONE
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMoney(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getActivePlacement(row: EmptyLegRow, publicListId: string) {
  if (!publicListId) return null;
  return row.placements.find((p) => p.publicListId === publicListId) ?? null;
}

function formatPlacementStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function EmptyLegsInventory() {
  const [rows, setRows] = useState<EmptyLegRow[]>([]);
  const [lists, setLists] = useState<PublicListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [includePast, setIncludePast] = useState(false);
  const [availability, setAvailability] = useState("");
  const [forceState, setForceState] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [publicListId, setPublicListId] = useState("");
  const [placementStatus, setPlacementStatus] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/charter/empty-legs/public-lists")
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && Array.isArray(json)) {
          setLists(
            json.map((list: PublicListOption) => ({
              id: list.id,
              name: list.name,
              isActive: list.isActive,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setExpandedId(null);
    setDetail(null);
    const params = new URLSearchParams();
    if (includePast) params.set("includePast", "true");
    if (availability) params.set("availabilityStatus", availability);
    if (forceState) params.set("forceState", forceState);
    if (featuredOnly) params.set("isFeatured", "true");
    if (publicListId) params.set("publicListId", publicListId);
    if (placementStatus) params.set("placementStatus", placementStatus);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/charter/empty-legs?${params}`);
    const json = await res.json();
    setLoading(false);
    if (res.ok) setRows(json);
  }, [
    includePast,
    availability,
    forceState,
    featuredOnly,
    publicListId,
    placementStatus,
    q,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected(new Set());
  }, [publicListId, placementStatus, availability, forceState, featuredOnly, includePast, q]);

  useEffect(() => {
    if (!expandedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void fetch(`/api/charter/empty-legs/${expandedId}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setDetail(json);
      })
      .finally(() => setDetailLoading(false));
  }, [expandedId]);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected]
  );

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: string, extra: Record<string, unknown> = {}) {
    if (selected.size === 0) return;
    setActionMsg("Working…");
    const listScoped =
      publicListId &&
      (action === "set_placement_status" ||
        action === "add_to_lists" ||
        action === "remove_from_lists")
        ? { publicListIds: [publicListId] }
        : {};
    const res = await fetch("/api/charter/empty-legs/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        action,
        ...listScoped,
        ...extra,
      }),
    });
    const json = await res.json();
    setActionMsg(res.ok ? `Updated ${json.updated}` : json.error ?? "Failed");
    await load();
    if (expandedId) {
      const detailRes = await fetch(`/api/charter/empty-legs/${expandedId}`);
      if (detailRes.ok) setDetail(await detailRes.json());
    }
  }

  async function setForce(id: string, forceStateValue: string | null) {
    await fetch(`/api/charter/empty-legs/${id}/force`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceState: forceStateValue }),
    });
    await load();
    if (expandedId === id) {
      const detailRes = await fetch(`/api/charter/empty-legs/${id}`);
      if (detailRes.ok) setDetail(await detailRes.json());
    }
  }

  async function saveNotes(id: string, internalNotes: string) {
    await fetch(`/api/charter/empty-legs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalNotes }),
    });
    await load();
  }

  async function saveFeatured(id: string, isFeatured: boolean) {
    await fetch(`/api/charter/empty-legs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured }),
    });
    await load();
  }

  async function saveSlidingWindow(
    id: string,
    slidingWindowStartAt: string | null,
    slidingWindowEndAt: string | null
  ) {
    await fetch(`/api/charter/empty-legs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slidingWindowStartAt, slidingWindowEndAt }),
    });
    await load();
    if (expandedId === id) {
      const detailRes = await fetch(`/api/charter/empty-legs/${id}`);
      if (detailRes.ok) setDetail(await detailRes.json());
    }
  }

  async function mergeFrom(sourceId: string) {
    if (!expandedId) return;
    setActionMsg("Merging…");
    const res = await fetch(`/api/charter/empty-legs/${expandedId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    const json = await res.json();
    setActionMsg(res.ok ? "Merged" : json.error ?? "Merge failed");
    await load();
    const detailRes = await fetch(`/api/charter/empty-legs/${expandedId}`);
    if (detailRes.ok) setDetail(await detailRes.json());
  }

  async function savePlacement(
    emptyLegId: string,
    placementId: string,
    patch: Record<string, unknown>
  ) {
    await fetch(`/api/charter/empty-legs/${emptyLegId}/placements/${placementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setEditingPlacementId(null);
    const detailRes = await fetch(`/api/charter/empty-legs/${emptyLegId}`);
    if (detailRes.ok) setDetail(await detailRes.json());
    await load();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden overscroll-none">
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-atlas-muted">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 block w-48 rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm text-atlas-text"
              placeholder="Trip, tail, route…"
            />
          </label>
          <label className="text-xs text-atlas-muted">
            Status
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="mt-1 block rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label className="text-xs text-atlas-muted">
            Force
            <select
              value={forceState}
              onChange={(e) => setForceState(e.target.value)}
              className="mt-1 block rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="force_available">Force Available</option>
              <option value="force_unavailable">Force Unavailable</option>
              <option value="none">No force</option>
            </select>
          </label>
          <label className="text-xs text-atlas-muted">
            List
            <select
              value={publicListId}
              onChange={(e) => {
                setPublicListId(e.target.value);
                if (!e.target.value) setPlacementStatus("");
              }}
              className="mt-1 block min-w-[10rem] rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
            >
              <option value="">Global</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                  {!list.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
          {publicListId ? (
            <label className="text-xs text-atlas-muted">
              Placement
              <select
                value={placementStatus}
                onChange={(e) => setPlacementStatus(e.target.value)}
                className="mt-1 block rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
              >
                <option value="">Any status</option>
                <option value="needs_approval">Needs approval</option>
                <option value="approved">Approved</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-atlas-muted">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
            />
            Featured only
          </label>
          <label className="flex items-center gap-2 text-sm text-atlas-muted">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
            Show past
          </label>
        </div>

        {publicListId && !loading ? (
          <p className="text-xs text-atlas-muted">
            Showing {rows.length} trip{rows.length === 1 ? "" : "s"} on this list.
            {rows.length > 0
              ? " Status, price, and list fields reflect this list’s placement."
              : ""}
          </p>
        ) : null}

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-atlas-border bg-atlas-surface p-3 text-sm">
            <span className="text-atlas-muted">{selected.size} selected</span>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("force_available")}>Force Available</button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("force_unavailable")}>Force Unavailable</button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("remove_force")}>Remove Force</button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("promote")}>Promote</button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("unpromote")}>Unpromote</button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("set_placement_status", { placementStatus: "approved" })}>
              {publicListId ? "Approve on this list" : "Approve placements"}
            </button>
            <button type="button" className="rounded border border-atlas-border px-2 py-1 text-xs" onClick={() => void runBulk("set_placement_status", { placementStatus: "hidden" })}>
              {publicListId ? "Hide on this list" : "Hide placements"}
            </button>
            {actionMsg ? <span className="text-xs text-atlas-muted">{actionMsg}</span> : null}
          </div>
        )}
      </div>

      <div className="atlas-scroll relative min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-none rounded-lg border border-atlas-border">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
          <thead className="text-left text-xs text-atlas-muted">
            <tr>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={loading || rows.length === 0}
                />
              </th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Status</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Tail</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Aircraft Type</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Route</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Departure</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Duration</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Base Price</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">
                {publicListId ? "List" : "Public Lists"}
              </th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Views</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Submissions</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Featured</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Force</th>
              <th className="sticky top-0 z-10 border-b border-atlas-border bg-atlas-surface px-2 py-2 font-medium">Last Synced</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="h-[min(24rem,50vh)] align-middle">
                  <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-atlas-muted">
                    Loading…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="h-[min(24rem,50vh)] align-middle">
                  <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-atlas-muted">
                    {publicListId
                      ? "No empty legs on this list match the current filters."
                      : "No empty legs yet. Run Charter sync to detect positioning flights."}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
              const listPlacement = getActivePlacement(row, publicListId);
              const listPriceHidden = listPlacement?.priceHidden ?? false;
              const listPrice =
                listPlacement?.finalDisplayPrice ?? listPlacement?.basePrice ?? null;
              return (
              <Fragment key={row.id}>
                <tr
                  onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                  className={cn(
                    "cursor-pointer border-b border-atlas-border/50 hover:bg-atlas-surface/40",
                    expandedId === row.id && "bg-atlas-accent/5"
                  )}
                >
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {publicListId ? (
                      listPlacement ? (
                        <StatusPill status={listPlacement.status} kind="placement" />
                      ) : (
                        <span className="text-xs text-atlas-muted">—</span>
                      )
                    ) : (
                      <StatusPill status={row.availabilityStatus} kind="availability" />
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{row.tailNumber}</td>
                  <td className="px-2 py-2">{row.aircraftType ?? "—"}</td>
                  <td className="px-2 py-2 font-mono text-xs">{row.routeKey}</td>
                  <td className="px-2 py-2 text-atlas-muted">
                    {formatDeparture(row.scheduledDepartureAt, row.depTimezone)}
                  </td>
                  <td className="px-2 py-2">{formatDuration(row.durationMinutes)}</td>
                  <td className="px-2 py-2 text-atlas-muted">
                    {publicListId
                      ? listPriceHidden
                        ? "Hidden"
                        : formatMoney(listPrice) ?? "—"
                      : row.priceHidden
                        ? "Hidden"
                        : formatMoney(row.finalDisplayPrice ?? row.basePrice) ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {publicListId ? (
                      listPlacement ? (
                        <span className="capitalize text-atlas-muted">
                          {formatPlacementStatus(listPlacement.status)}
                        </span>
                      ) : (
                        "—"
                      )
                    ) : (
                      <>
                        {row.placements.filter((p) => p.status === "approved").length}/
                        {row.placements.length}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-2">{row.detailOpenCount}</td>
                  <td className="px-2 py-2">{row.submissionCount}</td>
                  <td className="px-2 py-2">{row.isFeatured ? "Yes" : "—"}</td>
                  <td className="px-2 py-2 text-xs capitalize">
                    {row.forceState?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-atlas-muted">
                    {formatWhen(row.lastSyncedAt)}
                  </td>
                </tr>
                {expandedId === row.id && (
                  <tr className="border-b border-atlas-border bg-atlas-surface/30">
                    <td colSpan={14} className="px-4 py-4">
                      {detailLoading && <p className="text-sm text-atlas-muted">Loading detail…</p>}
                      {detail && detail.id === row.id && (
                        <ExpandedDetail
                          detail={detail}
                          editingPlacementId={editingPlacementId}
                          setEditingPlacementId={setEditingPlacementId}
                          onForce={setForce}
                          onSaveNotes={saveNotes}
                          onSaveFeatured={saveFeatured}
                          onSaveWindow={saveSlidingWindow}
                          onMerge={mergeFrom}
                          onSavePlacement={savePlacement}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  kind = "availability",
}: {
  status: string;
  kind?: "availability" | "placement";
}) {
  const label = formatPlacementStatus(status);
  const className =
    kind === "placement"
      ? status === "approved"
        ? "bg-emerald-500/20 text-emerald-300"
        : status === "hidden"
          ? "bg-slate-500/20 text-slate-300"
          : status === "needs_approval"
            ? "bg-amber-500/20 text-amber-300"
            : "bg-atlas-border/40 text-atlas-muted"
      : status === "available"
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-red-500/20 text-red-300";

  return (
    <span className={cn("rounded px-2 py-0.5 text-xs capitalize", className)}>
      {label}
    </span>
  );
}

function ExpandedDetail({
  detail,
  editingPlacementId,
  setEditingPlacementId,
  onForce,
  onSaveNotes,
  onSaveFeatured,
  onSaveWindow,
  onMerge,
  onSavePlacement,
}: {
  detail: DetailRow;
  editingPlacementId: string | null;
  setEditingPlacementId: (id: string | null) => void;
  onForce: (id: string, force: string | null) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onSaveFeatured: (id: string, featured: boolean) => Promise<void>;
  onSaveWindow: (id: string, start: string | null, end: string | null) => Promise<void>;
  onMerge: (sourceId: string) => Promise<void>;
  onSavePlacement: (
    emptyLegId: string,
    placementId: string,
    patch: Record<string, unknown>
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState(detail.internalNotes ?? "");
  const [windowStart, setWindowStart] = useState(
    detail.slidingWindowStartAt ? detail.slidingWindowStartAt.slice(0, 16) : ""
  );
  const [windowEnd, setWindowEnd] = useState(
    detail.slidingWindowEndAt ? detail.slidingWindowEndAt.slice(0, 16) : ""
  );

  useEffect(() => {
    setNotes(detail.internalNotes ?? "");
    setWindowStart(detail.slidingWindowStartAt ? detail.slidingWindowStartAt.slice(0, 16) : "");
    setWindowEnd(detail.slidingWindowEndAt ? detail.slidingWindowEndAt.slice(0, 16) : "");
  }, [detail]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-atlas-muted">Overview</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-atlas-muted">Trip</dt>
            <dd className="font-mono">
              <a
                href={detail.sourceJetInsightUrl ?? jetInsightTripUrl(detail.tripNumber)}
                target="_blank"
                rel="noreferrer"
                className="text-atlas-accent hover:underline"
              >
                {detail.tripNumber}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-atlas-muted">Route</dt>
            <dd className="font-mono">{detail.routeKey}</dd>
          </div>
          <div>
            <dt className="text-atlas-muted">Tail</dt>
            <dd className="font-mono">{detail.tailNumber}</dd>
          </div>
          <div>
            <dt className="text-atlas-muted">Aircraft</dt>
            <dd>{detail.aircraftType ?? "—"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1 text-xs"
            onClick={() => void onForce(detail.id, "force_available")}
          >
            Force Available
          </button>
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1 text-xs"
            onClick={() => void onForce(detail.id, "force_unavailable")}
          >
            Force Unavailable
          </button>
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1 text-xs"
            onClick={() => void onForce(detail.id, null)}
          >
            Remove Force
          </button>
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1 text-xs"
            onClick={() => void onSaveFeatured(detail.id, !detail.isFeatured)}
          >
            {detail.isFeatured ? "Unpromote" : "Promote"}
          </button>
        </div>
        {detail.forceAppliedBy && (
          <p className="text-xs text-atlas-muted">
            Force by {detail.forceAppliedBy.name} at {formatWhen(detail.forceAppliedAt)}
          </p>
        )}

        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Sliding departure window
          </h4>
          <div className="flex flex-wrap gap-2">
            <input
              type="datetime-local"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs"
            />
            <input
              type="datetime-local"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs"
            />
            <button
              type="button"
              className="rounded bg-atlas-accent px-2 py-1 text-xs text-white"
              onClick={() =>
                void onSaveWindow(
                  detail.id,
                  windowStart ? new Date(windowStart).toISOString() : null,
                  windowEnd ? new Date(windowEnd).toISOString() : null
                )
              }
            >
              Save window
            </button>
          </div>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Internal notes
          </h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            className="mt-2 rounded border border-atlas-border px-2 py-1 text-xs"
            onClick={() => void onSaveNotes(detail.id, notes)}
          >
            Save notes
          </button>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Stats
          </h4>
          <p className="text-sm text-atlas-muted">
            List views {detail.viewCount} · Detail opens {detail.detailOpenCount} · Submissions{" "}
            {detail.submissionCount}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Public list placements
          </h3>
          <div className="overflow-hidden rounded border border-atlas-border">
            <table className="w-full text-xs">
              <thead className="bg-atlas-bg text-atlas-muted">
                <tr>
                  <th className="px-2 py-1.5 text-left">List</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                  <th className="px-2 py-1.5 text-left">Pricing</th>
                  <th className="px-2 py-1.5 text-left" />
                </tr>
              </thead>
              <tbody>
                {detail.placements.map((p) => (
                  <tr key={p.id} className="border-t border-atlas-border/50">
                    <td className="px-2 py-1.5">{p.publicListName}</td>
                    <td className="px-2 py-1.5 capitalize">{p.status.replace(/_/g, " ")}</td>
                    <td className="px-2 py-1.5 capitalize">
                      {p.priceHidden
                        ? "Hidden"
                        : formatMoney(p.finalDisplayPrice ?? p.basePrice) ??
                          p.pricingMode.replace(/_/g, " ")}
                      {!p.priceHidden && p.finalDisplayPrice == null && p.customPrice != null
                        ? ` · $${p.customPrice}`
                        : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <PricingBreakdownButton emptyLegId={detail.id} placementId={p.id} />
                        <button
                          type="button"
                          className="text-atlas-accent hover:underline"
                          onClick={() =>
                            setEditingPlacementId(editingPlacementId === p.id ? null : p.id)
                          }
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingPlacementId &&
            detail.placements
              .filter((p) => p.id === editingPlacementId)
              .map((p) => (
                <PlacementEditor
                  key={p.id}
                  placement={p}
                  onSave={(patch) => void onSavePlacement(detail.id, p.id, patch)}
                  onCancel={() => setEditingPlacementId(null)}
                />
              ))}
        </div>

        {(detail.relatedHistory?.length ?? 0) > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-atlas-muted">
              Related history
            </h3>
            <ul className="space-y-2 text-sm">
              {detail.relatedHistory!.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded border border-atlas-border/60 px-2 py-1.5"
                >
                  <span className="font-mono text-xs">
                    {h.routeKey} · {h.historyReason?.replace(/_/g, " ")} ·{" "}
                    {formatWhen(h.updatedAt)}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-atlas-accent hover:underline"
                    onClick={() => void onMerge(h.id)}
                  >
                    Merge From Old Record
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function PlacementEditor({
  placement,
  onSave,
  onCancel,
}: {
  placement: EmptyLegRow["placements"][number];
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(placement.status);
  const [pricingMode, setPricingMode] = useState(placement.pricingMode);
  const [customPrice, setCustomPrice] = useState(
    placement.customPrice != null ? String(placement.customPrice) : ""
  );
  const [displayDiscountMode, setDisplayDiscountMode] = useState(placement.displayDiscountMode);

  return (
    <div className="mt-2 space-y-2 rounded border border-atlas-border bg-atlas-bg p-3">
      <p className="text-xs font-medium">{placement.publicListName}</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded border border-atlas-border px-2 py-1 text-xs"
        >
          <option value="needs_approval">Needs Approval</option>
          <option value="approved">Approved</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={pricingMode}
          onChange={(e) => setPricingMode(e.target.value as typeof pricingMode)}
          className="rounded border border-atlas-border px-2 py-1 text-xs"
        >
          <option value="calculated">Calculated</option>
          <option value="custom">Custom</option>
          <option value="hide_price">Do not show price</option>
        </select>
        <input
          type="number"
          placeholder="Custom price"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
          className="w-28 rounded border border-atlas-border px-2 py-1 text-xs"
        />
        <select
          value={displayDiscountMode}
          onChange={(e) =>
            setDisplayDiscountMode(e.target.value as typeof displayDiscountMode)
          }
          className="rounded border border-atlas-border px-2 py-1 text-xs"
        >
          <option value="none">No discount display</option>
          <option value="show_both">Show original + discounted</option>
          <option value="discounted_only">Discounted only</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-atlas-accent px-2 py-1 text-xs text-white"
          onClick={() =>
            onSave({
              status,
              pricingMode,
              displayDiscountMode,
              customPrice: customPrice === "" ? null : Number(customPrice),
            })
          }
        >
          Save placement
        </button>
        <button
          type="button"
          className="rounded border border-atlas-border px-2 py-1 text-xs"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
