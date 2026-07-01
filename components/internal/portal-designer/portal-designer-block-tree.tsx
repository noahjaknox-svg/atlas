"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import {
  blockLabel,
  findBlockById,
  getBlocksAtPath,
  isContainerBlock,
  isRowBlock,
  reorderBlocksInContainer,
  type BlockPath,
} from "@/lib/portal-block-layout";
import {
  duplicateBlockById,
  insertBlockAt,
  removeBlockById,
  createBlockId,
} from "@/lib/page-blocks-utils";
import { blockFromPaletteItem, PALETTE_ITEMS } from "./portal-designer-block-palette";
import { cn } from "@/lib/utils";

export type BlockSelection = {
  blockId: string;
  path: BlockPath;
};

function getSortableIds(blocks: ExperiencePageBlock[]): string[] {
  const ids: string[] = [];
  function walk(list: ExperiencePageBlock[]) {
    for (const b of list) {
      ids.push(b.id);
      if (isContainerBlock(b)) {
        for (const row of b.cells) {
          for (const cell of row) walk(cell);
        }
      } else if (isRowBlock(b)) {
        for (const col of b.columns) walk(col);
      }
    }
  }
  walk(blocks);
  return ids;
}

function containerPathForBlock(path: BlockPath): BlockPath {
  return path.length <= 1 ? [] : path.slice(0, -1);
}

function SortableTreeRow({
  block,
  path,
  depth,
  selected,
  onSelect,
  onDelete,
}: {
  block: ExperiencePageBlock;
  path: BlockPath;
  depth: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { path, blockId: block.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: `${depth * 12}px`,
      }}
      className={cn(
        "flex items-center gap-1 rounded border px-2 py-1 text-xs",
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
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-xs">
        {blockLabel(block)}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-xs text-atlas-muted hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

function CellDropZone({
  path,
  depth,
  label,
  onSetAddTarget,
  isAddTarget,
  children,
}: {
  path: BlockPath;
  depth: number;
  label: string;
  onSetAddTarget: () => void;
  isAddTarget: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${path.join("-")}`,
    data: { path, isColumn: true },
  });

  return (
    <div style={{ paddingLeft: `${depth * 12}px` }} className="space-y-0.5">
      <button
        type="button"
        onClick={onSetAddTarget}
        className={cn(
          "w-full rounded px-2 py-1 text-left text-xs",
          isAddTarget ? "bg-atlas-accent/10 text-atlas-accent" : "text-atlas-muted hover:text-atlas-text"
        )}
      >
        {label}
      </button>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[8px] space-y-0.5 rounded border border-dashed px-1 py-0.5",
          isOver ? "border-atlas-accent/50 bg-atlas-accent/5" : "border-transparent"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function BlockTreeNodes({
  blocks,
  pathPrefix,
  depth,
  selection,
  onSelect,
  onDelete,
  addTargetPath,
  onSetAddTarget,
}: {
  blocks: ExperiencePageBlock[];
  pathPrefix: BlockPath;
  depth: number;
  selection: BlockSelection | null;
  onSelect: (sel: BlockSelection) => void;
  onDelete: (id: string) => void;
  addTargetPath: BlockPath;
  onSetAddTarget: (path: BlockPath) => void;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        const path = [...pathPrefix, index];
        if (isContainerBlock(block)) {
          return (
            <div key={block.id} className="space-y-0.5">
              <SortableTreeRow
                block={block}
                path={path}
                depth={depth}
                selected={selection?.blockId === block.id}
                onSelect={() => onSelect({ blockId: block.id, path })}
                onDelete={() => onDelete(block.id)}
              />
              {block.cells.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const cellPath = [...path, rowIndex, colIndex];
                  return (
                    <CellDropZone
                      key={`${block.id}-r${rowIndex}-c${colIndex}`}
                      path={cellPath}
                      depth={depth + 1}
                      label={`Cell R${rowIndex + 1}C${colIndex + 1}`}
                      onSetAddTarget={() => onSetAddTarget(cellPath)}
                      isAddTarget={JSON.stringify(addTargetPath) === JSON.stringify(cellPath)}
                    >
                      <BlockTreeNodes
                        blocks={cell}
                        pathPrefix={cellPath}
                        depth={depth + 2}
                        selection={selection}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        addTargetPath={addTargetPath}
                        onSetAddTarget={onSetAddTarget}
                      />
                    </CellDropZone>
                  );
                })
              )}
            </div>
          );
        }

        if (isRowBlock(block)) {
          return (
            <div key={block.id} className="space-y-0.5">
              <SortableTreeRow
                block={block}
                path={path}
                depth={depth}
                selected={selection?.blockId === block.id}
                onSelect={() => onSelect({ blockId: block.id, path })}
                onDelete={() => onDelete(block.id)}
              />
              {block.columns.map((column, colIndex) => {
                const colPath = [...path, colIndex];
                return (
                  <CellDropZone
                    key={`${block.id}-col-${colIndex}`}
                    path={colPath}
                    depth={depth + 1}
                    label={`Column ${colIndex + 1}`}
                    onSetAddTarget={() => onSetAddTarget(colPath)}
                    isAddTarget={JSON.stringify(addTargetPath) === JSON.stringify(colPath)}
                  >
                    <BlockTreeNodes
                      blocks={column}
                      pathPrefix={colPath}
                      depth={depth + 2}
                      selection={selection}
                      onSelect={onSelect}
                      onDelete={onDelete}
                      addTargetPath={addTargetPath}
                      onSetAddTarget={onSetAddTarget}
                    />
                  </CellDropZone>
                );
              })}
            </div>
          );
        }

        return (
          <SortableTreeRow
            key={block.id}
            block={block}
            path={path}
            depth={depth}
            selected={selection?.blockId === block.id}
            onSelect={() => onSelect({ blockId: block.id, path })}
            onDelete={() => onDelete(block.id)}
          />
        );
      })}
    </>
  );
}

export function PortalDesignerBlockTree({
  blocks,
  selection,
  onSelect,
  onBlocksChange,
}: {
  blocks: ExperiencePageBlock[];
  selection: BlockSelection | null;
  onSelect: (sel: BlockSelection) => void;
  onBlocksChange: (blocks: ExperiencePageBlock[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addTargetPath, setAddTargetPath] = useState<BlockPath>([]);
  const sortableIds = useMemo(() => getSortableIds(blocks), [blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { path?: BlockPath; blockId?: string } | undefined;
    const overData = over.data.current as { path?: BlockPath; isColumn?: boolean; blockId?: string } | undefined;
    if (!activeData?.blockId) return;

    const activeLocated = findBlockById(blocks, activeData.blockId);
    if (!activeLocated) return;

    if (overData?.isColumn && overData.path) {
      const removed = removeBlockById(blocks, activeData.blockId);
      const targetCol = overData.path;
      const next = insertBlockAt(removed, targetCol, activeLocated.block);
      onBlocksChange(next);
      return;
    }

    if (overData?.blockId) {
      const overLocated = findBlockById(blocks, overData.blockId);
      if (!overLocated) return;

      const activeContainer = containerPathForBlock(activeLocated.path);
      const overContainer = containerPathForBlock(overLocated.path);

      if (JSON.stringify(activeContainer) === JSON.stringify(overContainer)) {
        const activeIndex = activeLocated.path[activeLocated.path.length - 1]!;
        const overIndex = overLocated.path[overLocated.path.length - 1]!;
        if (activeIndex !== overIndex) {
          onBlocksChange(
            reorderBlocksInContainer(blocks, activeContainer, activeIndex, overIndex)
          );
        }
      } else {
        const removed = removeBlockById(blocks, activeData.blockId);
        const overIndex = overLocated.path[overLocated.path.length - 1]!;
        onBlocksChange(insertBlockAt(removed, overContainer, activeLocated.block, overIndex));
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        <button
          type="button"
          onClick={() => setAddTargetPath([])}
          className={cn(
            "mb-1 w-full rounded px-2 py-1 text-left text-xs",
            addTargetPath.length === 0
              ? "bg-atlas-accent/10 text-atlas-accent"
              : "text-atlas-muted hover:text-atlas-text"
          )}
        >
          Page root
        </button>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={(e) => {
            handleDragEnd(e);
            setActiveId(null);
          }}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              <BlockTreeNodes
                blocks={blocks}
                pathPrefix={[]}
                depth={0}
                selection={selection}
                onSelect={onSelect}
                onDelete={(id) => onBlocksChange(removeBlockById(blocks, id))}
                addTargetPath={addTargetPath}
                onSetAddTarget={setAddTargetPath}
              />
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="rounded border border-atlas-accent bg-atlas-surface px-2 py-1 text-xs">
                Moving…
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        {blocks.length === 0 ? (
          <p className="px-1 py-2 text-xs text-atlas-muted">No blocks yet.</p>
        ) : null}
      </div>
      <div className="border-t border-atlas-border p-2">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-muted">
          Add block
        </p>
        <div className="flex flex-wrap gap-1">
          {PALETTE_ITEMS.map(({ label, item }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const block = blockFromPaletteItem(item);
                const next = insertBlockAt(blocks, addTargetPath, block);
                onBlocksChange(next);
                const newIndex = getBlocksAtPath(next, addTargetPath).findIndex(
                  (b) => b.id === block.id
                );
                onSelect({
                  blockId: block.id,
                  path: [...addTargetPath, newIndex],
                });
              }}
              className="rounded border border-atlas-border px-2 py-1 text-xs text-atlas-muted hover:border-atlas-accent/40 hover:text-atlas-text"
            >
              + {label}
            </button>
          ))}
        </div>
        {selection ? (
          <button
            type="button"
            onClick={() => onBlocksChange(duplicateBlockById(blocks, selection.blockId, createBlockId))}
            className="mt-2 text-xs text-atlas-accent hover:underline"
          >
            Duplicate selected block
          </button>
        ) : null}
      </div>
    </div>
  );
}
