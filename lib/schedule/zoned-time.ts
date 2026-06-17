/** Timezone-aware calendar helpers for the fleet timeline grid. */

export function zonedDateParts(
  instant: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
}

function getTimezoneOffsetMs(at: Date, timeZone: string): number {
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = new Date(at.toLocaleString("en-US", { timeZone }));
  return zoned.getTime() - utc.getTime();
}

/** UTC instant for local midnight on the calendar day of `anchor` in `timeZone`. */
export function startOfZonedDay(anchor: Date, timeZone: string): Date {
  const { year, month, day } = zonedDateParts(anchor, timeZone);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getTimezoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function addZonedDays(start: Date, days: number, timeZone: string): Date {
  const { year, month, day } = zonedDateParts(start, timeZone);
  const anchor = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return startOfZonedDay(anchor, timeZone);
}

export function formatZonedDateKey(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedDateParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function zonedStartFromDateKey(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return startOfZonedDay(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)), timeZone);
}

export function isTodayInTimezone(dateKey: string, timeZone: string): boolean {
  return dateKey === formatZonedDateKey(new Date(), timeZone);
}

export function isWeekendInTimezone(dateKey: string, timeZone: string): boolean {
  const instant = zonedStartFromDateKey(dateKey, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  return weekday === "Sat" || weekday === "Sun";
}

export const DEFAULT_SCHEDULE_GRID_TIMEZONE = "America/Phoenix";

/** Pick grid timezone from fleet home bases (PrismJet → SDL / Phoenix). */
export function resolveScheduleGridTimezone(
  tails: { homeBase: string | null }[],
  timezoneByIcao: Record<string, string>
): string {
  for (const tail of tails) {
    if (!tail.homeBase) continue;
    const icao = tail.homeBase.toUpperCase();
    const tz = timezoneByIcao[icao];
    if (tz) return tz;
  }
  return DEFAULT_SCHEDULE_GRID_TIMEZONE;
}
