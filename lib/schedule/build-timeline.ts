import type { ScheduleEvent } from "@prisma/client";
import { addDays, format, startOfDay } from "date-fns";
import type {
  TimelineBlock,
  TimelineBlockKind,
  TimelineDay,
  TimelineRow,
  ScheduleTimelineData,
} from "@/lib/schedule/timeline-types";
import type { AvailabilityWindow } from "@/lib/schedule/types";
import { TIMELINE_LEGEND } from "@/lib/schedule/timeline-types";
import { inferLocationAt } from "@/lib/schedule/location";
import { resolveRowTimezone } from "@/lib/schedule/airport-timezones";

export interface BuildTimelineInput {
  rangeStart: Date;
  rangeEnd: Date;
  tails: {
    tailNumber: string;
    homeBase: string | null;
    typeCode: string | null;
  }[];
  events: ScheduleEvent[];
  windows: AvailabilityWindow[];
  timezoneByIcao?: Record<string, string>;
}

export function buildScheduleTimeline(input: BuildTimelineInput): ScheduleTimelineData {
  const days = buildDays(input.rangeStart, input.rangeEnd);
  const eventsByTail = groupByTail(input.events);

  const rows: TimelineRow[] = input.tails.map((tail) => {
    const tailEvents = (eventsByTail.get(tail.tailNumber) ?? []).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    );
    const visibleEvents = tailEvents.filter(
      (e) => e.startsAt < input.rangeEnd && e.endsAt > input.rangeStart
    );
    const tailWindows = input.windows.filter((w) => w.tailNumber === tail.tailNumber);
    const locationAtRangeStart = inferLocationAt(
      tailEvents,
      input.rangeStart,
      tail.homeBase
    );

    const eventBlocks = visibleEvents.map((e) => eventToTimelineBlock(e, tail.homeBase));
    const windowBlocks = tailWindows.map((w) => windowToTimelineBlock(w, tail.homeBase));

    const blocks = [...eventBlocks, ...windowBlocks].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    const tz = resolveRowTimezone(tail.homeBase, input.timezoneByIcao ?? {});

    return {
      tailNumber: tail.tailNumber,
      homeBase: tail.homeBase,
      typeCode: tail.typeCode,
      locationAtRangeStart,
      timezone: tz.timezone,
      timezoneIcao: tz.timezoneIcao,
      blocks,
    };
  });

  return {
    rangeStart: input.rangeStart.toISOString(),
    rangeEnd: input.rangeEnd.toISOString(),
    days,
    rows,
    legend: TIMELINE_LEGEND,
    airportTimezones: input.timezoneByIcao ?? {},
  };
}

function buildDays(rangeStart: Date, rangeEnd: Date): TimelineDay[] {
  const days: TimelineDay[] = [];
  let cursor = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (cursor < end) {
    days.push({
      date: format(cursor, "yyyy-MM-dd"),
      label: format(cursor, "d"),
      weekday: format(cursor, "EEE"),
    });
    cursor = addDays(cursor, 1);
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

function eventToTimelineBlock(event: ScheduleEvent, homeBase: string | null): TimelineBlock {
  const kind = eventBlockKind(event);
  const route =
    event.depIcao && event.arrIcao ? `${event.depIcao} → ${event.arrIcao}` : event.locationIcao;
  const crewShort = formatCrewShort(event.picName, event.sicName);

  let label: string;
  let atlasNote: string;

  switch (kind) {
    case "needs_to_sell":
      label = `${route} · Repo`;
      atlasNote = `Positioning leg ${route} — pair with inbound charter request`;
      break;
    case "soft_hold":
      label = event.clientLabel ?? truncateSummary(event.summaryRaw);
      atlasNote = `Soft hold — confirm crewing before quoting`;
      break;
    case "hard_block":
      label = event.clientLabel
        ? `${event.clientLabel} · ${blockTypeLabel(event)}`
        : `${blockTypeLabel(event)}`;
      atlasNote = `Not available — ${blockTypeLabel(event).toLowerCase()}`;
      break;
    default:
      label = truncateSummary(event.summaryRaw);
      atlasNote = event.summaryRaw;
  }

  const sublabel = [
    route,
    event.paxCount != null ? `${event.paxCount} pax` : null,
    crewShort,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `evt-${event.id}`,
    kind,
    tailNumber: event.tailNumber,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    label,
    sublabel: sublabel || null,
    locationIcao: event.locationIcao ?? event.depIcao,
    depIcao: event.depIcao,
    arrIcao: event.arrIcao,
    paxCount: event.paxCount,
    crewShort,
    externalUrl: event.externalUrl,
    atlasNote,
    awayFromBase: isAwayFromBase(event.arrIcao ?? event.locationIcao, homeBase),
  };
}

function windowToTimelineBlock(
  window: AvailabilityWindow,
  homeBase: string | null
): TimelineBlock {
  const away = isAwayFromBase(window.locationIcao, homeBase);
  const timeLabel = formatTimeRange(window.startsAt, window.endsAt);
  const durationDays =
    (window.endsAt.getTime() - window.startsAt.getTime()) / (24 * 60 * 60 * 1000);

  const label =
    durationDays >= 1
      ? `Charter available · ${window.locationIcao}`
      : `Available · ${window.locationIcao}`;

  const atlasNote = away
    ? `Charter-quotable at ${window.locationIcao} (${timeLabel}) — away from home ${homeBase ?? "base"}`
    : `Charter-quotable at ${window.locationIcao} (${timeLabel})`;

  return {
    id: window.id,
    kind: "available",
    tailNumber: window.tailNumber,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    label,
    sublabel:
      durationDays >= 1
        ? `${Math.round(durationDays)}d at ${window.locationIcao}`
        : timeLabel,
    locationIcao: window.locationIcao,
    depIcao: null,
    arrIcao: null,
    paxCount: null,
    crewShort: null,
    externalUrl: null,
    atlasNote,
    awayFromBase: away,
  };
}

function eventBlockKind(event: ScheduleEvent): TimelineBlockKind {
  if (event.isHold || event.availabilityClass === "soft_hold") return "soft_hold";
  if (event.availabilityClass === "repo_opportunity") return "needs_to_sell";
  if (event.availabilityClass === "hard_block") return "hard_block";
  return "hard_block";
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

function isAwayFromBase(location: string | null, homeBase: string | null): boolean {
  if (!location) return false;
  if (!homeBase) return true;
  return location.toUpperCase() !== homeBase.toUpperCase();
}

function formatCrewShort(pic: string | null, sic: string | null): string | null {
  const picLast = pic?.split(/\s+/).pop();
  const sicLast = sic?.split(/\s+/).pop();
  if (picLast && sicLast) return `${picLast}/${sicLast}`;
  return picLast ?? sicLast ?? null;
}

function truncateSummary(summary: string): string {
  const cleaned = summary.replace(/^HOLD:\s*/i, "").trim();
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}…` : cleaned;
}

function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, "HH:mm")}–${format(end, "HH:mm")} UTC`;
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
