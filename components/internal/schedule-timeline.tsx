"use client";

import { useMemo } from "react";
import type {
  ScheduleTimelineData,
  TimelineBlock,
  TimelineLegendKind,
  TimelineNote,
} from "@/lib/schedule/timeline-types";
import { blockPosition } from "@/lib/schedule/build-timeline";
import {
  formatScheduleTimeRange,
  timezoneAbbr,
  type ScheduleTimeMode,
} from "@/lib/schedule/airport-timezones";
import { isTodayInTimezone, isWeekendInTimezone } from "@/lib/schedule/zoned-time";
import { cn } from "@/lib/utils";

const BLOCK_STYLES: Record<TimelineLegendKind, string> = {
  available: "border-emerald-500/60 bg-emerald-900/45 text-emerald-50",
  empty_leg: "border-blue-400/70 bg-blue-900/60 text-blue-50",
  unavailable: "border-red-500/60 bg-red-950/70 text-red-100",
  soft_hold: "border-amber-400/70 bg-amber-900/70 text-amber-50",
};

const TAIL_COL_W = 168;
const ROW_HEIGHT = 84;
const NOTE_STRIP_H = 18;

export function ScheduleTimeline({
  timeline,
  timeMode,
  userTimezone,
}: {
  timeline: ScheduleTimelineData;
  timeMode: ScheduleTimeMode;
  userTimezone: string;
}) {
  const gridTimezone = timeline.gridTimezone;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 rounded-lg border border-atlas-border/60 bg-atlas-surface/20 px-3 py-2">
        {timeline.legend.map((item) => (
          <div key={item.kind} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-3 w-3 shrink-0 rounded-sm border",
                BLOCK_STYLES[item.kind]
              )}
            />
            <span className="font-medium text-atlas-text">{item.label}</span>
            <span className="hidden text-atlas-muted lg:inline">— {item.description}</span>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-atlas-border">
        {/* Day header */}
        <div className="flex shrink-0 border-b-2 border-atlas-border bg-atlas-surface/50">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-atlas-border bg-atlas-surface px-3 py-2.5 text-xs font-medium text-atlas-muted"
            style={{ width: TAIL_COL_W }}
          >
            Aircraft
          </div>
          <div className="flex min-w-0 flex-1">
            {timeline.days.map((day, i) => (
              <div
                key={day.date}
                className={cn(
                  "min-w-0 flex-1 border-r border-atlas-border/70 px-1 py-2 text-center last:border-r-0",
                  i % 2 === 0 ? "bg-atlas-surface/30" : "bg-atlas-bg/80",
                  isWeekendInTimezone(day.date, gridTimezone) && "bg-atlas-surface/50",
                  isTodayInTimezone(day.date, gridTimezone) &&
                    "bg-atlas-accent/10 ring-1 ring-inset ring-atlas-accent/40"
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-atlas-muted">
                  {day.weekday}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isTodayInTimezone(day.date, gridTimezone) ? "text-atlas-accent" : "text-atlas-text"
                  )}
                >
                  {day.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {timeline.rows.map((row) => (
            <TimelineRowView
              key={row.tailNumber}
              row={row}
              timeline={timeline}
              timeMode={timeMode}
              userTimezone={userTimezone}
              gridTimezone={gridTimezone}
            />
          ))}

          {timeline.rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-atlas-muted">
              No aircraft in range. Sync JetInsight schedule first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineRowView({
  row,
  timeline,
  timeMode,
  userTimezone,
  gridTimezone,
}: {
  row: ScheduleTimelineData["rows"][0];
  timeline: ScheduleTimelineData;
  timeMode: ScheduleTimeMode;
  userTimezone: string;
  gridTimezone: string;
}) {
  const tzLabel =
    timeMode === "aircraft"
      ? row.timezoneIcao
        ? `${row.timezoneIcao} (${timezoneAbbr(timeline.rangeStart, row.timezone)})`
        : "UTC"
      : timezoneAbbr(timeline.rangeStart, userTimezone);

  const locationLabel = row.locationAtRangeStart
    ? `at ${row.locationAtRangeStart}`
    : row.homeBase
      ? `home ${row.homeBase}`
      : "";

  return (
    <div
      className="flex border-b border-atlas-border/70 last:border-b-0"
      style={{ minHeight: ROW_HEIGHT }}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-atlas-border bg-atlas-bg px-3 py-2"
        style={{ width: TAIL_COL_W, minHeight: ROW_HEIGHT }}
      >
        <div className="font-medium text-sm text-atlas-text">{row.tailNumber}</div>
        <div className="text-xs text-atlas-muted">
          {row.homeBase ?? "—"}
          {row.typeCode ? ` · ${row.typeCode}` : ""}
        </div>
        {locationLabel && (
          <div className="mt-0.5 text-[10px] text-atlas-accent/80">{locationLabel}</div>
        )}
        <div className="mt-0.5 text-[10px] text-atlas-muted/80">{tzLabel}</div>
      </div>

      <div className="relative min-w-0 flex-1" style={{ minHeight: ROW_HEIGHT }}>
        {/* Day columns */}
        <div className="absolute inset-0 flex">
          {timeline.days.map((day, i) => (
            <div
              key={day.date}
              className={cn(
                "min-w-0 flex-1 border-r border-atlas-border/50 last:border-r-0",
                i % 2 === 0 ? "bg-atlas-surface/[0.07]" : "bg-transparent",
                isWeekendInTimezone(day.date, gridTimezone) && "bg-atlas-surface/10",
                isTodayInTimezone(day.date, gridTimezone) && "bg-atlas-accent/[0.04]"
              )}
            />
          ))}
        </div>

        {/* Non-overlapping lane of availability / unavailability blocks */}
        {row.blocks.map((block) => (
          <TimelineBlockView
            key={block.id}
            block={block}
            rangeStart={timeline.rangeStart}
            rangeEnd={timeline.rangeEnd}
            timeMode={timeMode}
            rowTimezone={row.timezone}
            userTimezone={userTimezone}
            airportTimezones={timeline.airportTimezones}
          />
        ))}

        {/* Soft holds float in front, along the top of the lane */}
        {row.notes.map((note) => (
          <TimelineNoteView
            key={note.id}
            note={note}
            rangeStart={timeline.rangeStart}
            rangeEnd={timeline.rangeEnd}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineBlockView({
  block,
  rangeStart,
  rangeEnd,
  timeMode,
  rowTimezone,
  userTimezone,
  airportTimezones,
}: {
  block: TimelineBlock;
  rangeStart: string;
  rangeEnd: string;
  timeMode: ScheduleTimeMode;
  rowTimezone: string;
  userTimezone: string;
  airportTimezones: Record<string, string>;
}) {
  const { leftPct, widthPct } = blockPosition(block, rangeStart, rangeEnd);

  const displayTz = useMemo(() => {
    if (timeMode === "user") return userTimezone;
    const icao = block.startAirport?.toUpperCase();
    if (icao && airportTimezones[icao]) return airportTimezones[icao];
    return rowTimezone;
  }, [timeMode, userTimezone, block.startAirport, rowTimezone, airportTimezones]);

  const timeRange = formatScheduleTimeRange(block.startsAt, block.endsAt, displayTz, {
    includeTzAbbr: false,
  });

  return (
    <div
      title={`${block.routeLabel} · ${block.atlasNote}`}
      className={cn(
        "absolute bottom-1 flex flex-col justify-center overflow-hidden rounded-md border px-2 text-[10px] leading-snug shadow-sm",
        BLOCK_STYLES[block.kind]
      )}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top: NOTE_STRIP_H + 4,
      }}
    >
      <div className="line-clamp-1 font-semibold">{block.routeLabel}</div>
      {block.sublabel && <div className="line-clamp-1 opacity-90">{block.sublabel}</div>}
      <div className="line-clamp-1 tabular-nums opacity-80">{timeRange}</div>
    </div>
  );
}

function TimelineNoteView({
  note,
  rangeStart,
  rangeEnd,
}: {
  note: TimelineNote;
  rangeStart: string;
  rangeEnd: string;
}) {
  const { leftPct, widthPct } = blockPosition(note, rangeStart, rangeEnd);
  return (
    <div
      title={note.atlasNote}
      className={cn(
        "absolute z-20 flex items-center gap-1 overflow-hidden rounded-sm border px-1.5 py-0.5 text-[9px] font-medium shadow-sm",
        BLOCK_STYLES.soft_hold
      )}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, top: 2 }}
    >
      <span aria-hidden>⚑</span>
      <span className="line-clamp-1">{note.label}</span>
    </div>
  );
}
