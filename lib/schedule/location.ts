import type { ScheduleEvent } from "@prisma/client";

export function postEventLocation(event: ScheduleEvent, fallback: string | null): string | null {
  return event.arrIcao ?? event.locationIcao ?? event.depIcao ?? fallback;
}

export function inferLocationAt(
  events: ScheduleEvent[],
  at: Date,
  homeBase: string | null
): string | null {
  let location = homeBase?.toUpperCase() ?? null;
  for (const e of events) {
    if (e.endsAt <= at) {
      location = postEventLocation(e, location);
    } else if (e.startsAt <= at) {
      return (e.locationIcao ?? e.depIcao ?? location)?.toUpperCase() ?? location;
    } else {
      break;
    }
  }
  return location?.toUpperCase() ?? null;
}

export function inferInitialLocation(
  events: ScheduleEvent[],
  rangeStart: Date,
  homeBase: string | null
): string | null {
  return inferLocationAt(events, rangeStart, homeBase);
}
