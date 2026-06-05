"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  getAircraftBadge,
  getAircraftCardSubtitle,
  getAircraftDisplayName,
  type AircraftCardMeta,
  type AircraftBadge,
} from "@/lib/aircraft-workspace";

export type AircraftListItem = AircraftCardMeta & {
  assumptions: AssumptionMap;
  includedOnProposal?: boolean;
  clientSummary?: string | null;
  portalImageUrl?: string | null;
  portalVideoUrl?: string | null;
  portalSpecHighlights?: string[];
};

const badgeStyles: Record<AircraftBadge, string> = {
  ready: "bg-atlas-success/15 text-atlas-success",
  missing: "bg-amber-900/30 text-amber-200",
};

const badgeLabels: Record<AircraftBadge, string> = {
  ready: "Ready",
  missing: "Missing info",
};

export function AircraftListPanel({
  aircraft,
  selectedId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  aircraft: AircraftListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-atlas-border bg-atlas-bg/50">
      <div className="flex items-center justify-between gap-2 border-b border-atlas-border px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Aircraft on Proposal
        </p>
        <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onAdd}>
          + Add
        </Button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {aircraft.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-atlas-muted">
            No aircraft yet. Add one to configure.
          </p>
        )}
        {aircraft.map((ac) => (
          <AircraftCard
            key={ac.id}
            ac={ac}
            isSelected={ac.id === selectedId}
            canRemove={aircraft.length > 1}
            onSelect={() => onSelect(ac.id)}
            onDuplicate={() => onDuplicate(ac.id)}
            onRemove={() => onRemove(ac.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AircraftCard({
  ac,
  isSelected,
  canRemove,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  ac: AircraftListItem;
  isSelected: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = getAircraftBadge(ac.assumptions);
  const name = getAircraftDisplayName(ac.assumptions, ac);
  const subtitle = getAircraftCardSubtitle(ac.assumptions, ac);

  return (
    <div
      className={cn(
        "group relative rounded-md border p-2.5 transition-all",
        isSelected
          ? "border-atlas-accent bg-atlas-accent/5 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.35)]"
          : "border-atlas-border/80 bg-atlas-surface/60 hover:border-atlas-border"
      )}
    >
      <div className="flex items-start gap-1">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
          <p className="truncate text-sm font-medium leading-snug">{name}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] text-atlas-muted">{subtitle}</p>
          )}
          {badge === "missing" && (
            <span
              className={cn(
                "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                badgeStyles[badge]
              )}
            >
              {badgeLabels[badge]}
            </span>
          )}
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Aircraft actions"
            className="rounded px-1 py-0.5 text-atlas-muted opacity-0 transition-opacity hover:bg-atlas-border/40 hover:text-atlas-text group-hover:opacity-100 data-[open]:opacity-100"
            data-open={menuOpen || undefined}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-6 z-20 min-w-[120px] rounded border border-atlas-border bg-atlas-surface py-1 text-xs shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-atlas-accent/10"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-atlas-danger hover:bg-atlas-danger/10 disabled:opacity-40"
                  disabled={!canRemove}
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
