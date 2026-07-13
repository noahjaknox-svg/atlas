import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";

/** Common US charter airport timezones when not resolvable from coordinates. */
export const FALLBACK_TIMEZONES: Record<string, string> = {
  SDL: "America/Phoenix",
  PHX: "America/Phoenix",
  IWA: "America/Phoenix",
  SCF: "America/Phoenix",
  TUS: "America/Phoenix",
  OPF: "America/New_York",
  TEB: "America/New_York",
  HPN: "America/New_York",
  BGM: "America/New_York",
  PBI: "America/New_York",
  MSY: "America/Chicago",
  BFI: "America/Los_Angeles",
  SNA: "America/Los_Angeles",
  VNY: "America/Los_Angeles",
  LAX: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  OAK: "America/Los_Angeles",
  SJC: "America/Los_Angeles",
  TRM: "America/Los_Angeles",
  SBP: "America/Los_Angeles",
  LGB: "America/Los_Angeles",
  BUR: "America/Los_Angeles",
  SDM: "America/Los_Angeles",
  DAL: "America/Chicago",
  AUS: "America/Chicago",
  COS: "America/Denver",
  SLC: "America/Denver",
  HDN: "America/Denver",
  DEN: "America/Denver",
  BNA: "America/Chicago",
  CID: "America/Chicago",
  TWF: "America/Boise",
  COE: "America/Los_Angeles",
  RNO: "America/Los_Angeles",
  TVC: "America/Detroit",
  JAC: "America/Denver",
  ASE: "America/Denver",
  EGE: "America/Denver",
  HND: "Asia/Tokyo",
};

export type ScheduleTimeMode = "aircraft" | "user";

export function mergeTimezoneMap(
  fromDb: Record<string, string | null | undefined>
): Record<string, string> {
  const merged: Record<string, string> = { ...FALLBACK_TIMEZONES };
  for (const [icao, tz] of Object.entries(fromDb)) {
    if (tz) merged[icao.toUpperCase()] = tz;
  }
  return merged;
}

export function lookupFallbackTimezone(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const upper = code.trim().toUpperCase();
  return (
    FALLBACK_TIMEZONES[upper] ??
    FALLBACK_TIMEZONES[airportCodeKey(upper)] ??
    FALLBACK_TIMEZONES[toIcaoDisplay(upper)] ??
    null
  );
}

export function resolveRowTimezone(
  homeBase: string | null,
  timezoneByIcao: Record<string, string>
): { timezone: string; timezoneIcao: string | null } {
  if (!homeBase) return { timezone: "UTC", timezoneIcao: null };
  const icao = homeBase.toUpperCase();
  return {
    timezone:
      timezoneByIcao[icao] ??
      timezoneByIcao[airportCodeKey(icao)] ??
      lookupFallbackTimezone(icao) ??
      "UTC",
    timezoneIcao: icao,
  };
}

export function resolveBlockTimezone(
  block: { depIcao?: string | null; locationIcao?: string | null },
  rowHomeBase: string | null,
  timezoneByIcao: Record<string, string>
): string {
  const icao = (block.depIcao ?? block.locationIcao ?? rowHomeBase)?.toUpperCase();
  if (!icao) return "UTC";
  return (
    timezoneByIcao[icao] ??
    timezoneByIcao[airportCodeKey(icao)] ??
    lookupFallbackTimezone(icao) ??
    "UTC"
  );
}

export function formatScheduleTime(
  iso: string,
  timeZone: string,
  opts?: { includeTzAbbr?: boolean }
): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);

  if (!opts?.includeTzAbbr) return time;

  const abbr =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;

  return `${time} ${abbr}`;
}

export function formatScheduleTimeRange(
  startsAt: string,
  endsAt: string,
  timeZone: string,
  opts?: { includeTzAbbr?: boolean }
): string {
  return `${formatScheduleTime(startsAt, timeZone, opts)}–${formatScheduleTime(endsAt, timeZone, opts)}`;
}

/** Empty-leg departure: date + 24h time in the given IANA zone. */
export function formatEmptyLegDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function timezoneAbbr(iso: string, timeZone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone
  );
}

/** Empty-leg departure label with short TZ abbr (e.g. "Jul 10, 2026, 17:21 MDT"). */
export function formatEmptyLegDepartureLabel(iso: string, timeZone: string): string {
  return `${formatEmptyLegDateTime(iso, timeZone)} ${timezoneAbbr(iso, timeZone)}`;
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
