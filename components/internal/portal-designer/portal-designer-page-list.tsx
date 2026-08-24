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
import { UsageTypeSelector } from "@/components/internal/usage-type-selector";
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
        "rounded-md border border-transparent py-1",
        active && "border-atlas-accent/30 bg-atlas-accent/10",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-start gap-1 px-1">
        <button
          type="button"
          className="mt-0.5 cursor-grab px-1 text-[10px] text-atlas-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...listeners}
          {...attributes}
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSelect}
              className="min-w-0 flex-1 px-1 py-0.5 text-left text-sm font-medium leading-tight text-atlas-text"
            >
              {label}
            </button>
            <label
              className="flex shrink-0 items-center gap-1 text-xs text-atlas-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(e) => onToggleVisible(e.target.checked)}
                className="accent-atlas-accent"
              />
              Visible
            </label>
          </div>
          {slugPreview ? (
            <span className="mt-0.5 block truncate px-1 font-mono text-xs leading-tight text-atlas-muted">
              /{slugPreview}
            </span>
          ) : null}
        </div>
        {onDelete ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[10px]" onClick={onDelete}>
            Delete
          </Button>
        ) : (
          <span className="w-[3.25rem] shrink-0" aria-hidden />
        )}
      </div>
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
  usageTypes,
  selectedUsageTypeId,
  onSelectUsageType,
}: {
  sections: DesignerSection[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
  onToggleVisible: (sectionId: string, visible: boolean) => void;
  onReorder: (orderedIds: string[]) => void;
  onAddPage?: (input: { title: string; pageSlug: string }) => Promise<void>;
  onDeletePage?: (sectionId: string) => Promise<void>;
  canAddCustomPages?: boolean;
  usageTypes?: { id: string; name: string }[];
  selectedUsageTypeId?: string | null;
  onSelectUsageType?: (id: string | null) => void;
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
    const merged = [...system, ...custom].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!selectedUsageTypeId) return merged;
    return merged.filter(
      (s) => !s.usageTypeIds?.length || s.usageTypeIds.includes(selectedUsageTypeId)
    );
  }, [sections, selectedUsageTypeId]);

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
      {usageTypes && usageTypes.length > 0 && onSelectUsageType ? (
        <div className="shrink-0 border-b border-atlas-border px-3 py-2">
          <UsageTypeSelector
            usageTypes={usageTypes}
            selectedId={selectedUsageTypeId ?? null}
            onChange={onSelectUsageType}
          />
        </div>
      ) : null}
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
