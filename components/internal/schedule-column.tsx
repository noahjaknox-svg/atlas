"use client";

import type { KanbanColumnId, KanbanCard } from "@/lib/schedule/types";
import { ScheduleCard } from "@/components/internal/schedule-card";

const COLUMN_STYLES: Record<KanbanColumnId, string> = {
  available: "border-emerald-800/40",
  repo_opportunity: "border-blue-800/40",
  soft_hold: "border-amber-800/40",
  hard_block: "border-red-900/30",
};

export function ScheduleColumn({
  columnId,
  label,
  cards,
}: {
  columnId: KanbanColumnId;
  label: string;
  cards: KanbanCard[];
}) {
  return (
    <div
      className={`flex min-w-[240px] flex-1 flex-col rounded-lg border bg-atlas-surface/40 ${COLUMN_STYLES[columnId]}`}
    >
      <div className="flex items-center justify-between border-b border-atlas-border/60 px-3 py-3">
        <h2 className="text-sm font-medium tracking-tight text-atlas-text">{label}</h2>
        <span className="rounded-full bg-atlas-border/80 px-2 py-0.5 text-xs text-atlas-muted">
          {cards.length}
        </span>
      </div>
      <div className="flex max-h-[calc(100vh-16rem)] flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-[120px]">
        {cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-atlas-muted/70">No items</p>
        ) : (
          cards.map((card) => <ScheduleCard key={card.id} card={card} />)
        )}
      </div>
    </div>
  );
}
