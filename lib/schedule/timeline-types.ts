/** Atlas timeline block kinds — charter sales reference view. */
export type TimelineBlockKind =
  | "available"
  | "needs_to_sell"
  | "soft_hold"
  | "hard_block";

export interface TimelineBlock {
  id: string;
  kind: TimelineBlockKind;
  tailNumber: string;
  startsAt: string;
  endsAt: string;
  /** Primary line, e.g. "At COE · Available" or "SDL → TRM · Repo" */
  label: string;
  /** Secondary detail: client, crew, pax */
  sublabel: string | null;
  locationIcao: string | null;
  depIcao: string | null;
  arrIcao: string | null;
  paxCount: number | null;
  crewShort: string | null;
  externalUrl: string | null;
  /** Plain-language note for email matching / ops reference */
  atlasNote: string;
  /** True when plane is away from home base during an available window */
  awayFromBase: boolean;
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
}

export interface ScheduleTimelineData {
  rangeStart: string;
  rangeEnd: string;
  days: TimelineDay[];
  rows: TimelineRow[];
  legend: { kind: TimelineBlockKind; label: string; description: string }[];
  airportTimezones: Record<string, string>;
}

export const TIMELINE_LEGEND: ScheduleTimelineData["legend"] = [
  {
    kind: "available",
    label: "Available",
    description: "Charter-quotable — plane is free at the shown airport (home or away)",
  },
  {
    kind: "needs_to_sell",
    label: "Needs to sell",
    description: "Positioning/repo flight leg — pair with an inbound charter request",
  },
  {
    kind: "soft_hold",
    label: "Soft hold",
    description: "Informational hold — still quotable with scheduling confirmation",
  },
  {
    kind: "hard_block",
    label: "Hard block",
    description: "Not available — charter, owner, MX, no crew, or admin block",
  },
];
