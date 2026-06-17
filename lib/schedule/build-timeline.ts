import type { ScheduleEvent } from "@prisma/client";
import type {
  TimelineBlock,
  TimelineBlockKind,
  TimelineDay,
  TimelineNote,
  TimelineRow,
  ScheduleTimelineData,
} from "@/lib/schedule/timeline-types";
import type { AvailabilityWindow } from "@/lib/schedule/types";
import { TIMELINE_LEGEND } from "@/lib/schedule/timeline-types";
import { inferLocationAt } from "@/lib/schedule/location";
import { resolveRowTimezone } from "@/lib/schedule/airport-timezones";
import {
  addZonedDays,
  formatZonedDateKey,
  startOfZonedDay,
  zonedDateParts,
} from "@/lib/schedule/zoned-time";

export interface BuildTimelineInput {
  rangeStart: Date;
  rangeEnd: Date;
  gridTimezone: string;
  tails: {
    tailNumber: string;
    homeBase: string | null;
    typeCode: string | null;
  }[];
  events: ScheduleEvent[];
  windows: AvailabilityWindow[];
  timezoneByIcao?: Record<string, string>;
}

/** Higher priority wins when intervals overlap (red over blue over green). */
const KIND_PRIORITY: Record<TimelineBlockKind, number> = {
  unavailable: 3,
  empty_leg: 2,
  available: 1,
};

/** A single source interval before overlaps are resolved and merged. */
interface LanePiece {
  kind: TimelineBlockKind;
  start: number;
  end: number;
  dep: string | null;
  arr: string | null;
  event: ScheduleEvent | null;
  window: AvailabilityWindow | null;
}

export function buildScheduleTimeline(input: BuildTimelineInput): ScheduleTimelineData {
  const gridTimezone = input.gridTimezone;
  const rangeStart = startOfZonedDay(input.rangeStart, gridTimezone);
  const rangeEnd = input.rangeEnd.getTime() > rangeStart.getTime()
    ? input.rangeEnd
    : addZonedDays(rangeStart, 14, gridTimezone);
  const days = buildDays(rangeStart, rangeEnd, gridTimezone);
  const eventsByTail = groupByTail(input.events);
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  const rows: TimelineRow[] = input.tails.map((tail) => {
    const tailEvents = (eventsByTail.get(tail.tailNumber) ?? []).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    );
    const visibleEvents = tailEvents.filter(
      (e) => e.startsAt < rangeEnd && e.endsAt > rangeStart && !e.deletedAt
    );
    const tailWindows = input.windows.filter((w) => w.tailNumber === tail.tailNumber);
    const locationAtRangeStart = inferLocationAt(
      tailEvents,
      rangeStart,
      tail.homeBase
    );

    const pieces = collectLanePieces(
      visibleEvents,
      tailWindows,
      rangeStartMs,
      rangeEndMs
    );
    const segments = paintAndMerge(pieces, rangeStartMs, rangeEndMs);
    const blocks = segments.map((seg) => segmentToBlock(seg, tail));
    const notes = collectNotes(visibleEvents);

    const tz = resolveRowTimezone(tail.homeBase, input.timezoneByIcao ?? {});

    return {
      tailNumber: tail.tailNumber,
      homeBase: tail.homeBase,
      typeCode: tail.typeCode,
      locationAtRangeStart,
      timezone: tz.timezone,
      timezoneIcao: tz.timezoneIcao,
      blocks,
      notes,
    };
  });

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    gridTimezone,
    days,
    rows,
    legend: TIMELINE_LEGEND,
    airportTimezones: input.timezoneByIcao ?? {},
  };
}

/** Map each lane-occupying event/window to a clipped LanePiece. */
function collectLanePieces(
  events: ScheduleEvent[],
  windows: AvailabilityWindow[],
  rangeStartMs: number,
  rangeEndMs: number
): LanePiece[] {
  const pieces: LanePiece[] = [];

  for (const event of events) {
    const kind = laneKind(event);
    if (!kind) continue; // soft holds / info-only are notes, not lane blocks
    const start = Math.max(event.startsAt.getTime(), rangeStartMs);
    const end = Math.min(event.endsAt.getTime(), rangeEndMs);
    if (end <= start) continue;
    pieces.push({
      kind,
      start,
      end,
      dep: upper(event.depIcao ?? event.locationIcao),
      arr: upper(event.arrIcao ?? event.locationIcao ?? event.depIcao),
      event,
      window: null,
    });
  }

  for (const window of windows) {
    const start = Math.max(window.startsAt.getTime(), rangeStartMs);
    const end = Math.min(window.endsAt.getTime(), rangeEndMs);
    if (end <= start) continue;
    const loc = upper(window.locationIcao);
    pieces.push({
      kind: "available",
      start,
      end,
      dep: loc,
      arr: loc,
      event: null,
      window,
    });
  }

  return pieces;
}

/**
 * Paint pieces onto a single non-overlapping lane (higher priority wins
 * overlaps), then merge adjacent same-kind runs into one block, condensing
 * to the first departure and final arrival airport across the run.
 */
function paintAndMerge(
  pieces: LanePiece[],
  rangeStartMs: number,
  rangeEndMs: number
): MergedSegment[] {
  if (pieces.length === 0) return [];

  // Boundary points: every piece edge, clamped to the visible range.
  const bounds = new Set<number>();
  for (const p of pieces) {
    bounds.add(Math.max(p.start, rangeStartMs));
    bounds.add(Math.min(p.end, rangeEndMs));
  }
  const points = Array.from(bounds).sort((a, b) => a - b);

  // For each slice, pick the highest-priority piece covering its midpoint.
  const slices: { start: number; end: number; piece: LanePiece }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    if (end <= start) continue;
    const mid = (start + end) / 2;
    let winner: LanePiece | null = null;
    for (const p of pieces) {
      if (p.start <= mid && mid < p.end) {
        if (!winner || KIND_PRIORITY[p.kind] > KIND_PRIORITY[winner.kind]) {
          winner = p;
        }
      }
    }
    if (winner) slices.push({ start, end, piece: winner });
  }

  // Merge contiguous slices that share a kind into one section.
  const merged: MergedSegment[] = [];
  for (const slice of slices) {
    const last = merged[merged.length - 1];
    if (last && last.kind === slice.piece.kind && last.end === slice.start) {
      last.end = slice.end;
      if (last.pieces[last.pieces.length - 1] !== slice.piece) {
        last.pieces.push(slice.piece);
      }
    } else {
      merged.push({
        kind: slice.piece.kind,
        start: slice.start,
        end: slice.end,
        pieces: [slice.piece],
      });
    }
  }

  return merged;
}

interface MergedSegment {
  kind: TimelineBlockKind;
  start: number;
  end: number;
  pieces: LanePiece[];
}

function segmentToBlock(
  seg: MergedSegment,
  tail: { tailNumber: string; homeBase: string | null }
): TimelineBlock {
  const first = seg.pieces[0]!;
  const last = seg.pieces[seg.pieces.length - 1]!;
  const startAirport = first.dep ?? first.arr;
  const endAirport = last.arr ?? last.dep;
  const moved = !!startAirport && !!endAirport && startAirport !== endAirport;
  const routeLabel = moved
    ? `${startAirport} → ${endAirport}`
    : startAirport ?? endAirport ?? "—";

  const startIso = new Date(seg.start).toISOString();
  const endIso = new Date(seg.end).toISOString();
  const eventPieces = seg.pieces.filter((p) => p.event);
  const segmentCount = eventPieces.length || seg.pieces.length;

  let sublabel: string | null;
  let atlasNote: string;
  let awayFromBase = false;

  switch (seg.kind) {
    case "available": {
      const loc = startAirport ?? "base";
      awayFromBase = isAwayFromBase(startAirport, tail.homeBase);
      sublabel = awayFromBase ? `Open at ${loc} · away from ${tail.homeBase ?? "base"}` : `Open at ${loc}`;
      atlasNote = awayFromBase
        ? `Charter-quotable at ${loc} — away from home ${tail.homeBase ?? "base"}`
        : `Charter-quotable at ${loc}`;
      break;
    }
    case "empty_leg": {
      sublabel =
        eventPieces.length > 1 ? `Empty legs · ${eventPieces.length}` : "Empty leg · sell one-way";
      atlasNote = `Empty positioning leg ${routeLabel} — pair with an inbound charter request`;
      break;
    }
    default: {
      const detail = eventPieces.length > 1
        ? `${eventPieces.length} blocks`
        : blockDetail(last.event);
      sublabel = detail;
      atlasNote = `Not available — ${detail?.toLowerCase() ?? "occupied"}`;
      break;
    }
  }

  const idBase = first.event
    ? `evt-${first.event.id}`
    : first.window
      ? `win-${first.window.id}`
      : "seg";

  return {
    // Suffix with the segment start so a window split by a block stays unique.
    id: `${idBase}-${seg.start}`,
    kind: seg.kind,
    tailNumber: tail.tailNumber,
    startsAt: startIso,
    endsAt: endIso,
    startAirport,
    endAirport,
    routeLabel,
    sublabel,
    atlasNote,
    awayFromBase,
    segmentCount,
  };
}

/** JetInsight full-day holds like "Hold Pine Canyon (SDL - SDL)". */
function isJetInsightHoldEvent(event: ScheduleEvent): boolean {
  return event.isHold || /\bHold\s+[^(]+\(/i.test(event.summaryRaw);
}

/** Soft holds (and info-only events) become annotations in front of the lane. */
function collectNotes(events: ScheduleEvent[]): TimelineNote[] {
  return events
    .filter(
      (e) =>
        isJetInsightHoldEvent(e) ||
        e.availabilityClass === "soft_hold" ||
        e.availabilityClass === "info_only"
    )
    .map((e) => {
      const isInfo = !e.isHold && e.availabilityClass === "info_only";
      const who = e.clientLabel ?? truncateSummary(e.summaryRaw);
      return {
        id: `note-${e.id}`,
        tailNumber: e.tailNumber,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        label: isInfo ? who : `Hold · ${who}`,
        atlasNote: isInfo
          ? `Informational: ${who}`
          : `Soft hold — ${who}. Still quotable, confirm before booking.`,
      };
    });
}

/** Which lane category an event occupies, or null if it is a note. */
function laneKind(event: ScheduleEvent): TimelineBlockKind | null {
  if (isJetInsightHoldEvent(event) || event.availabilityClass === "soft_hold") return null;
  if (event.availabilityClass === "info_only") return null;
  if (event.availabilityClass === "repo_opportunity") return "empty_leg";
  return "unavailable";
}

function blockDetail(event: ScheduleEvent | null): string {
  if (!event) return "Blocked";
  const type = blockTypeLabel(event);
  return event.clientLabel ? `${event.clientLabel} · ${type}` : type;
}

function blockTypeLabel(event: ScheduleEvent): string {
  if (event.isAdminBlock) return "DONT QUOTE";
  if (/\bNo Crew\b/i.test(event.summaryRaw)) return "No Crew";
  switch (event.rawEventType) {
    case "charter":
      return "Charter";
    case "owner":
      return "Owner";
    case "maintenance":
      return "MX";
    case "training":
      return "Training";
    default:
      return "Blocked";
  }
}

function buildDays(rangeStart: Date, rangeEnd: Date, timeZone: string): TimelineDay[] {
  const days: TimelineDay[] = [];
  let cursor = rangeStart;
  const endMs = rangeEnd.getTime();

  while (cursor.getTime() < endMs) {
    const date = formatZonedDateKey(cursor, timeZone);
    const { day } = zonedDateParts(cursor, timeZone);
    days.push({
      date,
      label: String(day),
      weekday: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone,
      }).format(cursor),
    });
    cursor = addZonedDays(cursor, 1, timeZone);
  }
  return days;
}

function groupByTail(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const map = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const list = map.get(e.tailNumber) ?? [];
    list.push(e);
    map.set(e.tailNumber, list);
  }
  return map;
}

function isAwayFromBase(location: string | null, homeBase: string | null): boolean {
  if (!location) return false;
  if (!homeBase) return true;
  return location.toUpperCase() !== homeBase.toUpperCase();
}

function upper(value: string | null): string | null {
  return value ? value.toUpperCase() : null;
}

function truncateSummary(summary: string): string {
  const cleaned = summary.replace(/^HOLD:\s*/i, "").trim();
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}…` : cleaned;
}

/** Position a block as % left and width within the visible range. */
export function blockPosition(
  block: { startsAt: string; endsAt: string },
  rangeStart: string,
  rangeEnd: string
): { leftPct: number; widthPct: number } {
  const start = new Date(rangeStart).getTime();
  const end = new Date(rangeEnd).getTime();
  const total = end - start;
  if (total <= 0) return { leftPct: 0, widthPct: 100 };

  const bStart = Math.max(new Date(block.startsAt).getTime(), start);
  const bEnd = Math.min(new Date(block.endsAt).getTime(), end);
  const leftPct = ((bStart - start) / total) * 100;
  const widthPct = Math.max(((bEnd - bStart) / total) * 100, 0.5);
  return { leftPct, widthPct };
}
