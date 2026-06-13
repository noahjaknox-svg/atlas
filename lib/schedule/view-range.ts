/** Default visible window on the fleet timeline (days). */
export const SCHEDULE_VIEW_DAYS = 14;

export function scheduleRangeEnd(rangeStart: Date, days = SCHEDULE_VIEW_DAYS): Date {
  return new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function shiftScheduleRange(rangeStart: Date, dayDelta: number): Date {
  return new Date(rangeStart.getTime() + dayDelta * 24 * 60 * 60 * 1000);
}
