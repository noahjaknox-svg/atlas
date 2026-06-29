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
}: {
  zoneId: InsertionZoneId;
  active?: boolean;
  emptyColumn?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex items-center justify-center transition-all",
        emptyColumn
          ? "min-h-[140px] rounded-lg border border-dashed border-white/20 bg-transparent py-6"
          : "h-6 py-1",
        (isOver || active) && (emptyColumn ? "border-atlas-accent/60 bg-atlas-accent/10" : "h-10 py-2")
      )}
    >
      <div
        className={cn(
          "absolute inset-x-4 rounded-full transition-all",
          emptyColumn ? "hidden" : "h-0.5",
          isOver || active ? "bg-atlas-accent/80 h-1" : "bg-transparent group-hover:bg-white/10"
        )}
      />
      {emptyColumn ? (
        <span className="text-xs font-medium text-white/45">
          {isOver ? "Drop block here" : "Empty cell — drop a block here"}
        </span>
      ) : null}
      {(isOver || active) && !emptyColumn ? (
        <span className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full bg-atlas-accent text-[10px] font-bold text-atlas-bg">
          +
        </span>
      ) : null}
    </div>
  );
}
