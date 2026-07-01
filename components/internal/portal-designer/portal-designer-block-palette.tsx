"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import type { GridDimension } from "@/lib/experience-content";
import { createEmptyBlock, createEmptyContainer } from "@/lib/page-blocks-utils";

export const PALETTE_PREFIX = "palette:";

export type PaletteItem =
  | { kind: "block"; blockType: ExperiencePageBlock["type"] }
  | { kind: "container"; rows: GridDimension; cols: GridDimension };

export const PALETTE_ITEMS: { id: string; label: string; item: PaletteItem }[] = [
  { id: `${PALETTE_PREFIX}text`, label: "Text", item: { kind: "block", blockType: "text" } },
  { id: `${PALETTE_PREFIX}heading`, label: "Heading", item: { kind: "block", blockType: "heading" } },
  { id: `${PALETTE_PREFIX}image`, label: "Image", item: { kind: "block", blockType: "image" } },
  { id: `${PALETTE_PREFIX}quote`, label: "Quote", item: { kind: "block", blockType: "quote" } },
  { id: `${PALETTE_PREFIX}cta`, label: "Button", item: { kind: "block", blockType: "cta" } },
  { id: `${PALETTE_PREFIX}video`, label: "Video", item: { kind: "block", blockType: "video" } },
  { id: `${PALETTE_PREFIX}gallery`, label: "Gallery", item: { kind: "block", blockType: "gallery" } },
  { id: `${PALETTE_PREFIX}spacer`, label: "Spacer", item: { kind: "block", blockType: "spacer" } },
  { id: `${PALETTE_PREFIX}container`, label: "Container", item: { kind: "container", rows: 1, cols: 1 } },
];

export function blockFromPaletteItem(item: PaletteItem): ExperiencePageBlock {
  if (item.kind === "container") return createEmptyContainer(item.rows, item.cols);
  return createEmptyBlock(item.blockType);
}

export function parsePaletteId(id: string): PaletteItem | null {
  const entry = PALETTE_ITEMS.find((p) => p.id === id);
  return entry?.item ?? null;
}

function PaletteChip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={cn(
        "shrink-0 rounded-md border border-atlas-border/80 bg-atlas-bg/60 px-2.5 py-1 text-xs font-medium text-atlas-text",
        "min-h-[28px] cursor-grab active:cursor-grabbing hover:border-atlas-accent/40 hover:bg-atlas-accent/10",
        isDragging && "opacity-50"
      )}
    >
      {label}
    </button>
  );
}

export function PortalDesignerBlockPalette({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto",
        className
      )}
    >
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-atlas-muted">
        Blocks
      </span>
      {PALETTE_ITEMS.map((item) => (
        <PaletteChip key={item.id} id={item.id} label={item.label} />
      ))}
    </div>
  );
}
