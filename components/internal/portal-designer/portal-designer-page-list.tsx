"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
import {
  EXPERIENCE_TAB_LABELS,
  type ExperienceSectionType,
} from "@/lib/experience-content";
import { isCustomPortalPage, sectionNavSlug } from "@/lib/experience-page-slug";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DESIGNER_PAGE_TYPES, type DesignerSection } from "./portal-designer-types";
import { PortalDesignerAddPageModal } from "./portal-designer-add-page-modal";

function SortablePageRow({
  section,
  active,
  label,
  slugPreview,
  onSelect,
  onToggleVisible,
  onDelete,
}: {
  section: DesignerSection;
  active: boolean;
  label: string;
  slugPreview?: string;
  onSelect: () => void;
  onToggleVisible: (visible: boolean) => void;
  onDelete?: () => void;
}) {
  const id = section.id ?? section.sectionType;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "min-h-[4.5rem] rounded-md border border-transparent",
        active && "border-atlas-accent/30 bg-atlas-accent/10",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-center gap-1 px-1 py-1.5">
        <button
          type="button"
          className="cursor-grab px-1 text-[10px] text-atlas-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...listeners}
          {...attributes}
        >
          ⋮⋮
        </button>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-1 py-0.5 text-left text-sm">
          <span className="block truncate font-medium leading-tight text-atlas-text">{label}</span>
          <span
            className={cn(
              "mt-0.5 block h-4 truncate font-mono text-xs leading-tight text-atlas-muted",
              !slugPreview && "invisible"
            )}
          >
            {slugPreview ? `/${slugPreview}` : "/—"}
          </span>
        </button>
        {onDelete ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[10px]" onClick={onDelete}>
            Delete
          </Button>
        ) : (
          <span className="w-[3.25rem] shrink-0" aria-hidden />
        )}
      </div>
      <label className="flex h-7 items-center gap-1.5 px-2 pb-1.5 text-xs text-atlas-muted">
        <input
          type="checkbox"
          checked={section.visible}
          onChange={(e) => onToggleVisible(e.target.checked)}
          className="accent-atlas-accent"
        />
        Visible
      </label>
    </div>
  );
}

export function PortalDesignerPageList({
  sections,
  activeSectionId,
  onSelect,
  onToggleVisible,
  onReorder,
  onAddPage,
  onDeletePage,
  canAddCustomPages,
}: {
  sections: DesignerSection[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
  onToggleVisible: (sectionId: string, visible: boolean) => void;
  onReorder: (orderedIds: string[]) => void;
  onAddPage?: (input: { title: string; pageSlug: string }) => Promise<void>;
  onDeletePage?: (sectionId: string) => Promise<void>;
  canAddCustomPages?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const ordered = useMemo(() => {
    const system = DESIGNER_PAGE_TYPES.map((type) =>
      sections.find((s) => s.sectionType === type)
    ).filter((s): s is DesignerSection => !!s);
    const custom = sections
      .filter((s) => isCustomPortalPage(s))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return [...system, ...custom].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sections]);

  const sortableIds = ordered.map((s) => s.id ?? s.sectionType);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...sortableIds];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved!);
    onReorder(next);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-atlas-border px-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">Pages</p>
        {canAddCustomPages && onAddPage ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setAddOpen(true)}>
            + Add
          </Button>
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {ordered.map((section) => {
              const sectionId = section.id ?? section.sectionType;
              const label =
                isCustomPortalPage(section)
                  ? section.title
                  : (EXPERIENCE_TAB_LABELS[section.sectionType as ExperienceSectionType] ?? section.title);
              return (
                <SortablePageRow
                  key={sectionId}
                  section={section}
                  active={sectionId === activeSectionId}
                  label={label}
                  slugPreview={isCustomPortalPage(section) ? sectionNavSlug(section) : undefined}
                  onSelect={() => onSelect(sectionId)}
                  onToggleVisible={(visible) => onToggleVisible(sectionId, visible)}
                  onDelete={
                    isCustomPortalPage(section) && section.id && onDeletePage
                      ? () => {
                          if (confirm(`Delete "${section.title}"? This cannot be undone.`)) {
                            void onDeletePage(section.id!);
                          }
                        }
                      : undefined
                  }
                />
              );
            })}
          </nav>
        </SortableContext>
      </DndContext>

      {onAddPage ? (
        <PortalDesignerAddPageModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          creating={creating}
          onCreate={async (input) => {
            setCreating(true);
            try {
              await onAddPage(input);
            } finally {
              setCreating(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
