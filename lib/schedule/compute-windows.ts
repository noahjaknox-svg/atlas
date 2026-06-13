import type { ScheduleEvent } from "@prisma/client";
import type { AvailabilityWindow } from "@/lib/schedule/types";
import { inferLocationAt, postEventLocation } from "@/lib/schedule/location";

const DEFAULT_TURN_BUFFER_MS = 2 * 60 * 60 * 1000;
const MIN_WINDOW_MS = 30 * 60 * 1000;

export interface ComputeWindowsInput {
  rangeStart: Date;
  rangeEnd: Date;
  tails: { tailNumber: string; homeBase: string | null; fleetAircraftId: string | null }[];
  events: ScheduleEvent[];
  turnBufferMs?: number;
}

/** Charter-quotable windows — only hard_block events remove availability. */
export function computeAvailabilityWindows(input: ComputeWindowsInput): AvailabilityWindow[] {
  const buffer = input.turnBufferMs ?? DEFAULT_TURN_BUFFER_MS;
  const allWindows: AvailabilityWindow[] = [];

  for (const tail of input.tails) {
    const tailEvents = input.events
      .filter((e) => e.tailNumber === tail.tailNumber && !e.deletedAt)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const blockedRanges = mergeIntervals(
      tailEvents
        .filter((e) => e.availabilityClass === "hard_block")
        .map((e) => ({
          start: new Date(e.startsAt.getTime() - buffer),
          end: new Date(e.endsAt.getTime() + buffer),
        }))
        .filter((r) => r.end > input.rangeStart && r.start < input.rangeEnd)
    );

    const openRanges = gapsBetween(input.rangeStart, input.rangeEnd, blockedRanges);

    for (const open of openRanges) {
      const windowsInOpen = availabilityInOpenRange(
        tail,
        tailEvents,
        open.start,
        open.end,
        tail.homeBase
      );
      allWindows.push(...windowsInOpen);
    }
  }

  return allWindows.filter((w) => w.endsAt.getTime() - w.startsAt.getTime() >= MIN_WINDOW_MS);
}

function availabilityInOpenRange(
  tail: { tailNumber: string; homeBase: string | null; fleetAircraftId: string | null },
  events: ScheduleEvent[],
  openStart: Date,
  openEnd: Date,
  homeBase: string | null
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  let cursor = openStart;
  let location = inferLocationAt(events, openStart, homeBase);

  const movers = events
    .filter(
      (e) =>
        isMovementEvent(e) &&
        e.endsAt > openStart &&
        e.startsAt < openEnd
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  for (const event of movers) {
    const eventStart = new Date(Math.max(event.startsAt.getTime(), openStart.getTime()));
    const eventEnd = new Date(Math.min(event.endsAt.getTime(), openEnd.getTime()));

    if (eventStart > cursor && location) {
      windows.push(makeWindow(tail, location, cursor, eventStart));
    }

    if (eventEnd > cursor) {
      cursor = eventEnd;
    }
    location = postEventLocation(event, location);
  }

  if (cursor < openEnd && location) {
    windows.push(makeWindow(tail, location, cursor, openEnd));
  }

  return windows;
}

function makeWindow(
  tail: { tailNumber: string; fleetAircraftId: string | null },
  location: string,
  startsAt: Date,
  endsAt: Date
): AvailabilityWindow {
  return {
    id: `avail-${tail.tailNumber}-${startsAt.toISOString()}`,
    tailNumber: tail.tailNumber,
    locationIcao: location,
    startsAt,
    endsAt,
    fleetAircraftId: tail.fleetAircraftId,
  };
}

interface Interval {
  start: Date;
  end: Date;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [{ ...sorted[0]! }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.start.getTime() <= last.end.getTime()) {
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function gapsBetween(rangeStart: Date, rangeEnd: Date, blocked: Interval[]): Interval[] {
  if (blocked.length === 0) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  const gaps: Interval[] = [];
  let cursor = rangeStart;

  for (const block of blocked) {
    const blockStart = new Date(Math.max(block.start.getTime(), rangeStart.getTime()));
    const blockEnd = new Date(Math.min(block.end.getTime(), rangeEnd.getTime()));
    if (blockStart > cursor) {
      gaps.push({ start: cursor, end: blockStart });
    }
    cursor = maxDate(cursor, blockEnd);
  }

  if (cursor < rangeEnd) {
    gaps.push({ start: cursor, end: rangeEnd });
  }

  return gaps;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function isMovementEvent(e: ScheduleEvent): boolean {
  if (e.availabilityClass === "hard_block" || e.isHold || e.availabilityClass === "soft_hold") {
    return false;
  }
  if (e.depIcao && e.arrIcao && e.depIcao !== e.arrIcao) return true;
  return ["charter", "owner", "positioning", "ferry_mx", "training"].includes(e.rawEventType);
}
