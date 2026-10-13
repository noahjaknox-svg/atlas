"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { BlockPath } from "@/lib/portal-block-layout";

export type InsertionZoneId = string;

export function insertionZoneId(path: BlockPath, index: number): InsertionZoneId {
  return `insert:${path.join(".")}:${index}`;
}

export function parseInsertionZoneId(id: string): { path: BlockPath; index: number } | null {
  if (!id.startsWith("insert:")) return null;
  const rest = id.slice("insert:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon < 0) return null;
  const pathStr = rest.slice(0, lastColon);
  const index = parseInt(rest.slice(lastColon + 1), 10);
  if (Number.isNaN(index)) return null;
  const path = pathStr.length === 0 ? [] : pathStr.split(".").map((n) => parseInt(n, 10));
  return { path, index };
}

export function PortalDesignerInsertionZone({
  zoneId,
  active,
  emptyColumn,
  leading,
}: {
  zoneId: InsertionZoneId;
  active?: boolean;
  emptyColumn?: boolean;
  /** The zone before the first block: taken out of the flow so it doesn't pick up the list's gap. */
  leading?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId });

  // Between blocks the zone is an overlay: a zero-height anchor with the 24px drop strip floating over
  // the seam, so the canvas has exactly the spacing the published page has (the strip used to add
  // ~24px around every block, which skewed row heights and gaps). Empty cells keep an inline target.
  if (!emptyColumn) {
    return (
      <div
        className={cn(
          "pointer-events-none z-10 h-0 w-full",
          leading ? "absolute inset-x-0 top-0" : "relative"
        )}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "absolute inset-x-0 -top-3 flex h-6 items-center justify-center"
          )}
        >
          <div
            className={cn(
              "absolute inset-x-4 rounded-full transition-all",
              isOver || active ? "h-1 bg-atlas-accent/80" : "h-0.5 bg-transparent"
            )}
          />
          {isOver || active ? (
            <span className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full bg-atlas-accent text-[10px] font-bold text-atlas-bg">
              +
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-white/20 bg-transparent py-6 transition-all",
        (isOver || active) && "border-atlas-accent/60 bg-atlas-accent/10"
      )}
    >
      <span className="text-xs font-medium text-white/45">
        {isOver ? "Drop block here" : "Empty cell — drop a block here"}
      </span>
    </div>
  );
}
