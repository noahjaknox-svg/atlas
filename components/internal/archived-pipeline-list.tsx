"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BADGE_STYLES } from "@/lib/pipeline";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PipelineCardData } from "./pipeline-card";

export function ArchivedPipelineList({
  cards,
  onOpen,
  onRestore,
  restoringId,
}: {
  cards: PipelineCardData[];
  onOpen: (id: string) => void;
  onRestore: (id: string) => Promise<void>;
  restoringId: string | null;
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-atlas-border px-6 py-16 text-center text-sm text-atlas-muted">
        No archived deals match your filters.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex flex-wrap items-center gap-3 rounded-md border border-atlas-border bg-atlas-bg px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpen(card.id)}
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
            >
              <p className="font-medium text-atlas-text">{card.prospectName}</p>
              {card.subtitle ? (
                <p className="mt-0.5 truncate text-xs text-atlas-muted">{card.subtitle}</p>
              ) : null}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-atlas-muted">
              <span>{card.assigneeName ?? "Unassigned"}</span>
              {card.deletedAt ? (
                <span>Archived {format(new Date(card.deletedAt), "MMM d, yyyy")}</span>
              ) : null}
            </div>
            {card.badges.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {card.badges.map((badge) => (
                  <span
                    key={badge.id}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      BADGE_STYLES[badge.id]
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm" className="text-xs">
              <Link href={ROUTES.aircraftManagement.proposal(card.id)}>Open</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs"
              disabled={restoringId === card.id}
              onClick={() => void onRestore(card.id)}
            >
              {restoringId === card.id ? "Restoring…" : "Restore"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
