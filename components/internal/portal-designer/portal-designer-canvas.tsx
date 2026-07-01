"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ExperiencePageBlock, ExperienceSectionSnapshot } from "@/lib/experience-content";
import {
  duplicateBlockById,
  findBlockById,
  insertBlockAt,
  reorderBlocksInContainer,
  type BlockPath,
} from "@/lib/portal-block-layout";
import {
  convertBlockType,
  createBlockId,
  removeBlockById,
  replaceBlockById,
} from "@/lib/page-blocks-utils";
import {
  blockFromPaletteItem,
  parsePaletteId,
  PALETTE_PREFIX,
  PortalDesignerBlockPalette,
} from "./portal-designer-block-palette";
import { parseInsertionZoneId } from "./portal-designer-insertion-zone";
import { PortalDesignerPreview } from "./portal-designer-preview";
import type { BlockSelection } from "./portal-designer-block-tree";
import type { BlockDiagnostic } from "@/lib/portal-block-diagnostics";
import type { PreviewViewport } from "./portal-designer-types";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import {
  PortalDesignerBlockContextMenu,
  type BlockContextMenuState,
} from "./portal-designer-block-context-menu";

export function PortalDesignerCanvas({
  section,
  blocks,
  viewport,
  payload,
  selectedBlockId,
  selection,
  onSelect,
  onBlocksChange,
  diagnostics = [],
  toolbarRight,
  layoutSettings,
}: {
  section: ExperienceSectionSnapshot;
  blocks: ExperiencePageBlock[];
  viewport: PreviewViewport;
  payload?: ProposalSnapshotPayload | null;
  selectedBlockId?: string | null;
  selection: BlockSelection | null;
  onSelect: (sel: BlockSelection | null) => void;
  onBlocksChange: (blocks: ExperiencePageBlock[]) => void;
  diagnostics?: BlockDiagnostic[];
  toolbarRight?: ReactNode;
  layoutSettings?: import("@/lib/portal-layout-settings").PortalLayoutSettings;
}) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<BlockContextMenuState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeLabel = useMemo(() => {
    if (!activeDragId) return null;
    if (activeDragId.startsWith(PALETTE_PREFIX)) {
      const item = parsePaletteId(activeDragId);
      return item?.kind === "container" ? "Container" : "Block";
    }
    const located = findBlockById(blocks, activeDragId);
    return located ? located.block.type : "Block";
  }, [activeDragId, blocks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setContextMenu(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      const insertTarget = parseInsertionZoneId(overId);

      if (insertTarget) {
        const paletteItem = parsePaletteId(String(active.id));
        if (paletteItem) {
          const newBlock = blockFromPaletteItem(paletteItem);
          onBlocksChange(insertBlockAt(blocks, insertTarget.path, newBlock, insertTarget.index));
          onSelect({ blockId: newBlock.id, path: [...insertTarget.path, insertTarget.index] });
          return;
        }

        const from = findBlockById(blocks, String(active.id));
        if (from) {
          let next = removeBlockById(blocks, from.block.id);
          const adjustedPath = adjustPathAfterRemoval(from.path, insertTarget.path);
          let insertIndex = insertTarget.index;
          if (
            pathsEqual(from.path.slice(0, -1), insertTarget.path) &&
            from.path[from.path.length - 1]! < insertTarget.index
          ) {
            insertIndex -= 1;
          }
          next = insertBlockAt(next, adjustedPath, from.block, insertIndex);
          onBlocksChange(next);
          onSelect({ blockId: from.block.id, path: [...adjustedPath, insertIndex] });
        }
        return;
      }

      if (active.id === over.id) return;
      const activeLocated = findBlockById(blocks, String(active.id));
      const overLocated = findBlockById(blocks, overId);
      if (!activeLocated || !overLocated) return;

      const sameContainer =
        activeLocated.path.slice(0, -1).join(".") === overLocated.path.slice(0, -1).join(".");
      if (!sameContainer) return;

      const containerPath = activeLocated.path.slice(0, -1);
      const oldIndex = activeLocated.path[activeLocated.path.length - 1]!;
      const newIndex = overLocated.path[overLocated.path.length - 1]!;
      if (oldIndex === newIndex) return;

      onBlocksChange(reorderBlocksInContainer(blocks, containerPath, oldIndex, newIndex));
    },
    [blocks, onBlocksChange, onSelect]
  );

  const handleBlockContextMenu = useCallback(
    (e: React.MouseEvent, block: ExperiencePageBlock, path: BlockPath) => {
      e.preventDefault();
      setContextMenu({
        blockId: block.id,
        path,
        x: e.clientX,
        y: e.clientY,
        block,
      });
    },
    []
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      onBlocksChange(removeBlockById(blocks, blockId));
      if (selection?.blockId === blockId) onSelect(null);
    },
    [blocks, onBlocksChange, onSelect, selection?.blockId]
  );

  const handleDuplicateBlock = useCallback(
    (blockId: string) => {
      onBlocksChange(duplicateBlockById(blocks, blockId, createBlockId));
    },
    [blocks, onBlocksChange]
  );

  const handleChangeBlockType = useCallback(
    (blockId: string, newType: ExperiencePageBlock["type"]) => {
      const located = findBlockById(blocks, blockId);
      if (!located) return;
      const converted = convertBlockType(located.block, newType);
      if (converted.type === located.block.type) return;
      onBlocksChange(replaceBlockById(blocks, blockId, converted));
    },
    [blocks, onBlocksChange]
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[snapCenterToCursor]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-atlas-border px-3">
            <PortalDesignerBlockPalette />
            {toolbarRight ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">{toolbarRight}</div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1">
            <PortalDesignerPreview
              section={section}
              viewport={viewport}
              payload={payload}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(blockId) => {
                const located = findBlockById(blocks, blockId);
                if (located) onSelect({ blockId, path: located.path });
              }}
              previewMode
              designMode
              designViewport={viewport}
              onBlockContextMenu={handleBlockContextMenu}
              diagnostics={diagnostics}
              blocks={blocks}
              layoutSettings={layoutSettings}
            />
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDragId ? (
            <div className="rounded-md border border-atlas-accent bg-atlas-surface px-3 py-1.5 text-xs text-atlas-text shadow-lg">
              {activeLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <PortalDesignerBlockContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onEdit={(blockId) => {
          const located = findBlockById(blocks, blockId);
          if (located) onSelect({ blockId, path: located.path });
        }}
        onDelete={handleDeleteBlock}
        onDuplicate={handleDuplicateBlock}
        onChangeType={handleChangeBlockType}
      />
    </>
  );
}

function pathsEqual(a: BlockPath, b: BlockPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function adjustPathAfterRemoval(removedPath: BlockPath, targetPath: BlockPath): BlockPath {
  if (removedPath.length === 0) return targetPath;
  const result = [...targetPath];
  for (let i = 0; i < Math.min(removedPath.length - 1, result.length); i++) {
    if (removedPath[i] !== result[i]) return result;
    if (removedPath[i]! < result[i]!) result[i]! -= 1;
  }
  return result;
}
