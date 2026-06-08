"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { BADGE_STYLES, type PipelineBadge } from "@/lib/pipeline";

export interface PipelineCardData {
  id: string;
  prospectName: string;
  subtitle: string | null;
  pipelineStage: string;
  status: string;
  isParked: boolean;
  updatedAt: string;
  assignedToId: string | null;
  assigneeName: string | null;
  aircraftCategory: string | null;
  badges: PipelineBadge[];
  missingFieldLabels?: string[];
}

function assigneeInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PipelineCard({
  card,
  onClick,
  isDragging,
}: {
  card: PipelineCardData;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform } = useDraggable({
    id: card.id,
    data: { stage: card.pipelineStage },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full items-stretch rounded-md border border-atlas-border bg-atlas-bg transition-colors",
        "hover:border-atlas-accent/50",
        card.isParked && "opacity-60",
        isDragging && "opacity-40 shadow-lg ring-1 ring-atlas-accent"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        className="flex w-6 shrink-0 cursor-grab items-center justify-center rounded-l-md border-r border-atlas-border/60 text-atlas-muted hover:bg-atlas-surface/60 hover:text-atlas-text active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-atlas-accent/50"
        aria-label="Drag to move"
      >
        <span className="text-[10px] leading-none tracking-tighter">⋮⋮</span>
      </button>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-atlas-accent/50"
      >
        <p className="font-medium leading-snug text-atlas-text">{card.prospectName}</p>
        {card.subtitle && (
          <p className="mt-1 truncate text-xs text-atlas-muted">{card.subtitle}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-atlas-border text-[10px] font-medium text-atlas-muted"
              title={card.assigneeName ?? "Unassigned"}
            >
              {assigneeInitials(card.assigneeName)}
            </span>
            <span className="truncate text-[11px] text-atlas-muted">
              {card.assigneeName ?? "Unassigned"}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-atlas-muted">
            {formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {card.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.badges.map((badge) => (
              <span
                key={badge.id}
                title={
                  badge.id === "missing_info" && card.missingFieldLabels?.length
                    ? `Missing: ${card.missingFieldLabels.join(", ")}`
                    : undefined
                }
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  BADGE_STYLES[badge.id]
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}
