/** Atlas timeline block kinds — charter sales reference view. */
export type TimelineBlockKind = "available" | "empty_leg" | "unavailable";

export interface TimelineBlock {
  id: string;
  kind: TimelineBlockKind;
  tailNumber: string;
  startsAt: string;
  endsAt: string;
  /** First departure airport across the combined section. */
  startAirport: string | null;
  /** Final arrival airport across the combined section. */
  endAirport: string | null;
  /** Condensed route, e.g. "SDL → COE" for a move or "COE" when stationary. */
  routeLabel: string;
  /** Kind-specific detail line: client, "Empty leg", duration, etc. */
  sublabel: string | null;
  /** Plain-language note for email matching / ops reference. */
  atlasNote: string;
  /** True when an available plane sits away from its home base. */
  awayFromBase: boolean;
  /** How many underlying events/windows were combined into this block. */
  segmentCount: number;
}

/** Soft holds are shown as annotations in front of the lane, not as blocks. */
export interface TimelineNote {
  id: string;
  tailNumber: string;
  startsAt: string;
  endsAt: string;
  label: string;
  atlasNote: string;
}

export interface TimelineDay {
  date: string;
  label: string;
  weekday: string;
}

export interface TimelineRow {
  tailNumber: string;
  homeBase: string | null;
  typeCode: string | null;
  /** Estimated location at range start */
  locationAtRangeStart: string | null;
  /** IANA timezone for aircraft home base */
  timezone: string;
  timezoneIcao: string | null;
  blocks: TimelineBlock[];
  notes: TimelineNote[];
}

export type TimelineLegendKind = TimelineBlockKind | "soft_hold";

export interface ScheduleTimelineData {
  rangeStart: string;
  rangeEnd: string;
  /** IANA timezone used for day columns and block positioning. */
  gridTimezone: string;
  days: TimelineDay[];
  rows: TimelineRow[];
  legend: { kind: TimelineLegendKind; label: string; description: string }[];
  airportTimezones: Record<string, string>;
}

export const TIMELINE_LEGEND: ScheduleTimelineData["legend"] = [
  {
    kind: "available",
    label: "Available",
    description: "Free to sell — plane sits at the shown airport over the open start/end times",
  },
  {
    kind: "empty_leg",
    label: "Empty leg",
    description: "Positioning flight with no pax — sell it as a one-way",
  },
  {
    kind: "unavailable",
    label: "Unavailable",
    description: "Occupied charter/owner flight or a hard block (MX, no crew, owner)",
  },
  {
    kind: "soft_hold",
    label: "Soft hold",
    description: "Tentative hold shown as a note in front of the schedule — still quotable",
  },
];
