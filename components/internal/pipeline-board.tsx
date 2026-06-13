"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { AircraftCategory, PipelineStage, ProposalStatus } from "@prisma/client";
import {
  PIPELINE_COLUMNS,
  PIPELINE_DATE_RANGES,
  PIPELINE_STATUS_FILTERS,
  filterCardsByDateRange,
  matchesAircraftCategory,
} from "@/lib/pipeline";
import { PipelineColumn } from "./pipeline-column";
import { PipelineCard, type PipelineCardData } from "./pipeline-card";
import { ProposalDetailPanel } from "./proposal-detail-panel";

type AtlasUser = { id: string; name: string };

const AIRCRAFT_CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All aircraft types" },
  { value: "light_jet", label: "Light jet" },
  { value: "midsize_jet", label: "Midsize jet" },
  { value: "super_midsize_jet", label: "Super midsize" },
  { value: "large_cabin_jet", label: "Large cabin" },
  { value: "ultra_long_range_jet", label: "Ultra long range" },
  { value: "turboprop", label: "Turboprop" },
  { value: "piston", label: "Piston" },
  { value: "helicopter", label: "Helicopter" },
  { value: "other", label: "Other" },
];

function parseAssigneeFilter(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

export function PipelineBoard({
  initialCards,
  atlasUsers,
  isAdmin,
  totalCount,
  hasMore: initialHasMore,
}: {
  initialCards: PipelineCardData[];
  atlasUsers: AtlasUser[];
  isAdmin?: boolean;
  totalCount?: number;
  hasMore?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const query = searchParams.get("q") ?? "";
  const assigneeRaw = searchParams.get("assignee") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const categoryFilter = searchParams.get("category") ?? "all";
  const rangeFilter = searchParams.get("range") ?? "all";
  const selectedId = searchParams.get("id");
  const panelOpen = !!selectedId;

  const [searchInput, setSearchInput] = useState(query);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/pipeline?${qs}` : "/pipeline", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== query) {
        updateParams({ q: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, query, updateParams]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/proposals/pipeline?page=1");
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards ?? data);
      setPage(1);
      setHasMore(data.hasMore ?? false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/proposals/pipeline?page=${nextPage}`);
      if (!res.ok) return;
      const data = await res.json();
      const nextCards = data.cards ?? [];
      setCards((prev) => [...prev, ...nextCards]);
      setPage(nextPage);
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  useEffect(() => {
    setCards(initialCards);
    setHasMore(initialHasMore ?? false);
    setPage(1);
  }, [initialCards, initialHasMore]);

  const assigneeSet = useMemo(() => parseAssigneeFilter(assigneeRaw), [assigneeRaw]);

  const uniqueAtlasUsers = useMemo(
    () => Array.from(new Map(atlasUsers.map((u) => [u.id, u])).values()),
    [atlasUsers]
  );

  const filtered = useMemo(() => {
    let list = cards;

    const q = searchInput.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.prospectName.toLowerCase().includes(q) ||
          (c.subtitle?.toLowerCase().includes(q) ?? false) ||
          (c.assigneeName?.toLowerCase().includes(q) ?? false)
      );
    }

    if (assigneeSet.size > 0) {
      list = list.filter((c) => {
        if (assigneeSet.has("unassigned") && !c.assignedToId) return true;
        if (c.assignedToId && assigneeSet.has(c.assignedToId)) return true;
        return false;
      });
    }

    if (statusFilter !== "all") {
      const status = statusFilter as ProposalStatus;
      list = list.filter((c) => {
        if (status === "internal_review") {
          return c.status === "internal_review";
        }
        if (status === "viewed") {
          return c.status === "viewed" || c.badges.some((b) => b.id === "viewed");
        }
        return c.status === status;
      });
    }

    if (categoryFilter !== "all") {
      list = list.filter((c) =>
        matchesAircraftCategory(
          c.aircraftCategory as AircraftCategory | null,
          categoryFilter
        )
      );
    }

    list = filterCardsByDateRange(list, rangeFilter);

    return list;
  }, [cards, searchInput, assigneeSet, statusFilter, categoryFilter, rangeFilter]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(
      PIPELINE_COLUMNS.map((col) => [col.id, [] as PipelineCardData[]])
    ) as Record<PipelineStage, PipelineCardData[]>;
    for (const card of filtered) {
      const stage = card.pipelineStage as PipelineStage;
      if (map[stage]) map[stage].push(card);
    }
    return map;
  }, [filtered]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  function toggleAssignee(userId: string) {
    const next = new Set(parseAssigneeFilter(assigneeRaw));
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    const value = Array.from(next).join(",") || null;
    updateParams({ assignee: value });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cardId = String(active.id);
    const newStage = over.id as PipelineStage;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.pipelineStage === newStage) return;

    const prev = cards;
    setCards((list) =>
      list.map((c) => (c.id === cardId ? { ...c, pipelineStage: newStage } : c))
    );

    const res = await fetch(`/api/proposals/${cardId}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });

    if (!res.ok) {
      setCards(prev);
      return;
    }
    await refresh();
  }

  function handleCardClick(id: string) {
    updateParams({ id });
  }

  function handlePanelOpenChange(open: boolean) {
    if (!open) updateParams({ id: null });
  }

  function resetFilters() {
    setSearchInput("");
    router.replace("/pipeline", { scroll: false });
  }

  const hasActiveFilters =
    !!query ||
    assigneeSet.size > 0 ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    rangeFilter !== "all";

  return (
    <>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search prospects, aircraft, assignee…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 min-w-[200px] flex-1 rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm max-w-md focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
          />
          <select
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="h-10 rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
          >
            {PIPELINE_STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => updateParams({ category: e.target.value })}
            className="h-10 rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
          >
            {AIRCRAFT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={rangeFilter}
            onChange={(e) => updateParams({ range: e.target.value })}
            className="h-10 rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
          >
            {PIPELINE_DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-md border border-atlas-border px-3 text-sm text-atlas-muted hover:text-atlas-text"
            >
              Reset filters
            </button>
          ) : null}
        </div>
        <p className="text-xs text-atlas-muted">
          Tip: press{" "}
          <kbd className="rounded border border-atlas-border px-1 font-mono">⌘K</kbd> to focus search
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-atlas-muted">Assigned to</span>
          <button
            type="button"
            onClick={() => updateParams({ assignee: null })}
            className={`rounded-full px-2.5 py-1 text-xs ${
              assigneeSet.size === 0
                ? "bg-atlas-accent/20 text-atlas-accent"
                : "bg-atlas-border text-atlas-muted hover:text-atlas-text"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => toggleAssignee("unassigned")}
            className={`rounded-full px-2.5 py-1 text-xs ${
              assigneeSet.has("unassigned")
                ? "bg-atlas-accent/20 text-atlas-accent"
                : "bg-atlas-border text-atlas-muted hover:text-atlas-text"
            }`}
          >
            Unassigned
          </button>
          {uniqueAtlasUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleAssignee(u.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${
                assigneeSet.has(u.id)
                  ? "bg-atlas-accent/20 text-atlas-accent"
                  : "bg-atlas-border text-atlas-muted hover:text-atlas-text"
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <PipelineColumn
              key={col.id}
              stage={col.id}
              label={col.label}
              cards={byStage[col.id] ?? []}
              onCardClick={handleCardClick}
              activeCardId={activeId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[220px] rotate-2 opacity-95">
              <PipelineCard card={activeCard} onClick={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {hasMore ? (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-atlas-border px-4 py-2 text-sm text-atlas-muted hover:bg-atlas-surface disabled:opacity-50"
          >
            {loadingMore
              ? "Loading…"
              : `Load more${totalCount ? ` (${cards.length} of ${totalCount})` : ""}`}
          </button>
        </div>
      ) : null}

      <ProposalDetailPanel
        proposalId={selectedId}
        open={panelOpen}
        onOpenChange={handlePanelOpenChange}
        onUpdated={refresh}
        atlasUsers={atlasUsers}
        isAdmin={isAdmin}
      />
    </>
  );
}
