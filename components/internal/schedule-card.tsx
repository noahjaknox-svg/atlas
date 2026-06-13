"use client";

import { format } from "date-fns";
import type { KanbanCard } from "@/lib/schedule/types";

const BADGE_STYLES: Record<string, string> = {
  HOLD: "bg-amber-900/40 text-amber-200",
  "DONT QUOTE": "bg-red-900/40 text-red-200",
  Charter: "bg-emerald-900/40 text-emerald-200",
  Owner: "bg-sky-900/40 text-sky-200",
  MX: "bg-red-900/30 text-red-200",
  Repo: "bg-blue-900/40 text-blue-200",
  Ferry: "bg-indigo-900/40 text-indigo-200",
  Training: "bg-orange-900/40 text-orange-200",
  "No Crew": "bg-zinc-700/60 text-zinc-200",
};

function formatRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${format(s, "MMM d")} · ${format(s, "HH:mm")}–${format(e, "HH:mm")} UTC`;
  }
  return `${format(s, "MMM d HH:mm")} – ${format(e, "MMM d HH:mm")} UTC`;
}

export function ScheduleCard({ card }: { card: KanbanCard }) {
  if (card.kind === "available") {
    return (
      <div className="rounded-md border border-emerald-800/50 bg-emerald-950/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-atlas-text">{card.tailNumber}</span>
          <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
            Available
          </span>
        </div>
        <p className="mt-1 text-sm text-atlas-muted">At {card.locationIcao}</p>
        <p className="mt-1 text-xs text-atlas-muted/80">
          {formatRange(card.startsAt, card.endsAt)}
        </p>
      </div>
    );
  }

  const route =
    card.depIcao && card.arrIcao ? `${card.depIcao} → ${card.arrIcao}` : card.locationIcao;

  return (
    <div className="rounded-md border border-atlas-border bg-atlas-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-atlas-text">{card.tailNumber}</p>
          {card.clientLabel && (
            <p className="truncate text-sm text-atlas-muted">{card.clientLabel}</p>
          )}
        </div>
        {card.externalUrl && (
          <a
            href={card.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-atlas-accent hover:underline"
          >
            JI
          </a>
        )}
      </div>
      <p className="mt-1 text-sm text-atlas-text">{route}</p>
      <p className="mt-0.5 text-xs text-atlas-muted/80">
        {formatRange(card.startsAt, card.endsAt)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {card.paxCount != null && (
          <span className="text-xs text-atlas-muted">{card.paxCount} pax</span>
        )}
        {card.crewShort && (
          <span className="text-xs text-atlas-muted">· {card.crewShort}</span>
        )}
      </div>
      {card.badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.badges.map((badge) => (
            <span
              key={badge}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${BADGE_STYLES[badge] ?? "bg-atlas-border text-atlas-muted"}`}
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
