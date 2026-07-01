"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { DESIGNER_BLOCK_TYPES } from "./portal-designer-types";

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: ExperiencePageBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const label = DESIGNER_BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded border px-2 py-1.5 text-xs",
        selected
          ? "border-atlas-accent/50 bg-atlas-accent/10"
          : "border-atlas-border/60 bg-atlas-bg/40",
        isDragging && "opacity-70"
      )}
    >
      <button
        type="button"
        className="cursor-grab px-1 text-atlas-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {label}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-[10px] text-atlas-muted hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

export function PortalDesignerBlockList({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onReorder,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
}: {
  blocks: ExperiencePageBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onReorder: (blocks: ExperiencePageBlock[]) => void;
  onAddBlock: (type: ExperiencePageBlock["type"]) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved!);
    onReorder(next);
  }

  return (
    <div className="flex h-full flex-col border-t border-atlas-border">
      <div className="border-b border-atlas-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
          Blocks
        </p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <SortableBlockRow
                key={block.id}
                block={block}
                selected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {blocks.length === 0 ? (
          <p className="px-1 py-2 text-[10px] text-atlas-muted">No blocks yet.</p>
        ) : null}
      </div>
      <div className="border-t border-atlas-border p-2">
        <div className="flex flex-wrap gap-1">
          {DESIGNER_BLOCK_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onAddBlock(type)}
              className="rounded border border-atlas-border px-2 py-1 text-[10px] text-atlas-muted hover:border-atlas-accent/40 hover:text-atlas-text"
            >
              + {label}
            </button>
          ))}
        </div>
        {selectedBlockId ? (
          <button
            type="button"
            onClick={() => onDuplicateBlock(selectedBlockId)}
            className="mt-2 text-[10px] text-atlas-accent hover:underline"
          >
            Duplicate selected block
          </button>
        ) : null}
      </div>
    </div>
  );
}
