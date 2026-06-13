"use client";

import { useMemo } from "react";
import type { ScheduleTimelineData, TimelineBlock } from "@/lib/schedule/timeline-types";
import { blockPosition } from "@/lib/schedule/build-timeline";
import {
  formatScheduleTimeRange,
  resolveBlockTimezone,
  timezoneAbbr,
  type ScheduleTimeMode,
} from "@/lib/schedule/airport-timezones";
import { cn } from "@/lib/utils";

const BLOCK_STYLES = {
  available:
    "border-emerald-600/50 bg-emerald-900/40 text-emerald-50",
  needs_to_sell:
    "border-blue-500/70 bg-blue-950/70 text-blue-50",
  soft_hold:
    "border-amber-500/70 bg-amber-950/60 text-amber-50",
  hard_block:
    "border-zinc-500/70 bg-zinc-900/90 text-zinc-200",
} as const;

const TAIL_COL_W = 168;
const ROW_HEIGHT = 96;
const CARD_HEIGHT = 56;

function isTodayUtc(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function ScheduleTimeline({
  timeline,
  timeMode,
  userTimezone,
}: {
  timeline: ScheduleTimelineData;
  timeMode: ScheduleTimeMode;
  userTimezone: string;
}) {
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
                  isWeekend(day.date) && "bg-atlas-surface/50",
                  isTodayUtc(day.date) &&
                    "bg-atlas-accent/10 ring-1 ring-inset ring-atlas-accent/40"
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-atlas-muted">
                  {day.weekday}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isTodayUtc(day.date) ? "text-atlas-accent" : "text-atlas-text"
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
}: {
  row: ScheduleTimelineData["rows"][0];
  timeline: ScheduleTimelineData;
  timeMode: ScheduleTimeMode;
  userTimezone: string;
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

  const availabilityBlocks = row.blocks.filter((b) => b.kind === "available");
  const overlayBlocks = row.blocks.filter((b) => b.kind !== "available");

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

      <div
        className="relative min-w-0 flex-1"
        style={{ minHeight: ROW_HEIGHT }}
      >
        {/* Day columns */}
        <div className="absolute inset-0 flex">
          {timeline.days.map((day, i) => (
            <div
              key={day.date}
              className={cn(
                "min-w-0 flex-1 border-r border-atlas-border/50 last:border-r-0",
                i % 2 === 0 ? "bg-atlas-surface/[0.07]" : "bg-transparent",
                isWeekend(day.date) && "bg-atlas-surface/10",
                isTodayUtc(day.date) && "bg-atlas-accent/[0.04]"
              )}
            />
          ))}
        </div>

        {availabilityBlocks.map((block) => (
          <TimelineBlockView
            key={block.id}
            block={block}
            rangeStart={timeline.rangeStart}
            rangeEnd={timeline.rangeEnd}
            layer="background"
            timeMode={timeMode}
            rowTimezone={row.timezone}
            rowHomeBase={row.homeBase}
            userTimezone={userTimezone}
            airportTimezones={timeline.airportTimezones}
          />
        ))}

        {overlayBlocks.map((block) => (
          <TimelineBlockView
            key={block.id}
            block={block}
            rangeStart={timeline.rangeStart}
            rangeEnd={timeline.rangeEnd}
            layer="foreground"
            timeMode={timeMode}
            rowTimezone={row.timezone}
            rowHomeBase={row.homeBase}
            userTimezone={userTimezone}
            airportTimezones={timeline.airportTimezones}
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
  layer,
  timeMode,
  rowTimezone,
  rowHomeBase,
  userTimezone,
  airportTimezones,
}: {
  block: TimelineBlock;
  rangeStart: string;
  rangeEnd: string;
  layer: "background" | "foreground";
  timeMode: ScheduleTimeMode;
  rowTimezone: string;
  rowHomeBase: string | null;
  userTimezone: string;
  airportTimezones: Record<string, string>;
}) {
  const { leftPct, widthPct } = blockPosition(block, rangeStart, rangeEnd);
  const isAvailable = block.kind === "available";

  const displayTz = useMemo(() => {
    if (timeMode === "user") return userTimezone;
    if (isAvailable && block.locationIcao) {
      return (
        airportTimezones[block.locationIcao.toUpperCase()] ??
        resolveBlockTimezone(block, rowHomeBase, airportTimezones)
      );
    }
    return resolveBlockTimezone(block, rowHomeBase, airportTimezones) || rowTimezone;
  }, [timeMode, userTimezone, isAvailable, block, rowHomeBase, rowTimezone, airportTimezones]);

  const timeRange = formatScheduleTimeRange(block.startsAt, block.endsAt, displayTz, {
    includeTzAbbr: false,
  });

  const multiDay =
    new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime() >=
    24 * 60 * 60 * 1000;

  return (
    <div
      title={block.atlasNote}
      className={cn(
        "absolute overflow-hidden rounded-md border px-2 text-[10px] leading-snug shadow-sm",
        BLOCK_STYLES[block.kind],
        layer === "background"
          ? "top-0 bottom-0 z-0 flex flex-col justify-center"
          : "z-10 flex flex-col justify-center",
        layer === "foreground" && "top-1/2 -translate-y-1/2"
      )}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        minWidth: layer === "foreground" ? 52 : undefined,
        height: layer === "foreground" ? CARD_HEIGHT : undefined,
      }}
    >
      <div className="line-clamp-1 font-semibold">{block.label}</div>
      {block.sublabel && !isAvailable && (
        <div className="line-clamp-1 opacity-90">{block.sublabel}</div>
      )}
      {isAvailable && multiDay ? (
        <div className="line-clamp-1 opacity-90">{block.sublabel}</div>
      ) : (
        <div className="line-clamp-1 tabular-nums opacity-80">{timeRange}</div>
      )}
      {!isAvailable && block.crewShort && (
        <div className="line-clamp-1 opacity-70">{block.crewShort}</div>
      )}
      {block.awayFromBase && isAvailable && (
        <div className="line-clamp-1 text-[9px] opacity-70">away from home</div>
      )}
    </div>
  );
}
