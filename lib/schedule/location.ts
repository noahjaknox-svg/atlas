import type { ScheduleEvent } from "@prisma/client";
import { airportCodesMatch } from "@/lib/airports/code-match";

export function postEventLocation(event: ScheduleEvent, fallback: string | null): string | null {
  const parked =
    event.depIcao &&
    event.arrIcao &&
    airportCodesMatch(event.depIcao, event.arrIcao);
  if (parked) {
    return event.arrIcao ?? event.depIcao ?? fallback;
  }
  return event.arrIcao ?? event.locationIcao ?? event.depIcao ?? fallback;
}

function locationDuringEvent(event: ScheduleEvent, fallback: string | null): string | null {
  const parked =
    event.depIcao &&
    event.arrIcao &&
    airportCodesMatch(event.depIcao, event.arrIcao);
  if (parked) {
    return event.arrIcao ?? event.depIcao ?? fallback;
  }
  return event.depIcao ?? event.locationIcao ?? fallback;
}

function sortEventsChronologically(events: ScheduleEvent[]): ScheduleEvent[] {
  return [...events].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.endsAt.getTime() - b.endsAt.getTime()
  );
}

export function inferLocationAt(
  events: ScheduleEvent[],
  at: Date,
  homeBase: string | null
): string | null {
  let location = homeBase?.toUpperCase() ?? null;
  for (const e of sortEventsChronologically(events)) {
    if (e.endsAt <= at) {
      location = postEventLocation(e, location);
    } else if (e.startsAt <= at) {
      return locationDuringEvent(e, location)?.toUpperCase() ?? location;
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
