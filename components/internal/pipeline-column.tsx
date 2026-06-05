"use client";

import { useDroppable } from "@dnd-kit/core";
import type { PipelineStage } from "@prisma/client";
import { PipelineCard, type PipelineCardData } from "./pipeline-card";

export function PipelineColumn({
  stage,
  label,
  cards,
  onCardClick,
  activeCardId,
}: {
  stage: PipelineStage;
  label: string;
  cards: PipelineCardData[];
  onCardClick: (id: string) => void;
  activeCardId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[220px] flex-1 flex-col rounded-lg border border-atlas-border/80 bg-atlas-surface/40 ${
        isOver ? "border-atlas-accent/60 bg-atlas-surface/70" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-atlas-border/60 px-3 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          {label}
        </h2>
        <span className="rounded-full bg-atlas-border/80 px-2 py-0.5 text-xs text-atlas-muted">
          {cards.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
        {cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-atlas-muted/70">No proposals</p>
        ) : (
          cards.map((card) => (
            <PipelineCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
              isDragging={activeCardId === card.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
