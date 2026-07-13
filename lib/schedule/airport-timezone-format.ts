import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";

/** Common US charter airport timezones when not resolvable from coordinates. */
export const FALLBACK_TIMEZONES: Record<string, string> = {
  SDL: "America/Phoenix",
  PHX: "America/Phoenix",
  IWA: "America/Phoenix",
  SCF: "America/Phoenix",
  TUS: "America/Phoenix",
  GYR: "America/Phoenix",
  DVT: "America/Phoenix",
  FFZ: "America/Phoenix",
  OPF: "America/New_York",
  TEB: "America/New_York",
  HPN: "America/New_York",
  BGM: "America/New_York",
  PBI: "America/New_York",
  FLL: "America/New_York",
  MIA: "America/New_York",
  FXE: "America/New_York",
  BCT: "America/New_York",
  APF: "America/New_York",
  EYW: "America/New_York",
  MCO: "America/New_York",
  TPA: "America/New_York",
  SFB: "America/New_York",
  ORL: "America/New_York",
  JAX: "America/New_York",
  VRB: "America/New_York",
  MMU: "America/New_York",
  EWR: "America/New_York",
  JFK: "America/New_York",
  LGA: "America/New_York",
  ISP: "America/New_York",
  FRG: "America/New_York",
  BED: "America/New_York",
  BOS: "America/New_York",
  PVD: "America/New_York",
  BDL: "America/New_York",
  IAD: "America/New_York",
  DCA: "America/New_York",
  BWI: "America/New_York",
  PHL: "America/New_York",
  ILG: "America/New_York",
  RIC: "America/New_York",
  ORF: "America/New_York",
  RDU: "America/New_York",
  CLT: "America/New_York",
  GSO: "America/New_York",
  CHS: "America/New_York",
  SAV: "America/New_York",
  ATL: "America/New_York",
  PDK: "America/New_York",
  FTY: "America/New_York",
  MCN: "America/New_York",
  AGS: "America/New_York",
  BNA: "America/Chicago",
  MEM: "America/Chicago",
  MSN: "America/Chicago",
  MKE: "America/Chicago",
  ORD: "America/Chicago",
  MDW: "America/Chicago",
  PWK: "America/Chicago",
  DPA: "America/Chicago",
  ARR: "America/Chicago",
  STL: "America/Chicago",
  SUS: "America/Chicago",
  MCI: "America/Chicago",
  MKC: "America/Chicago",
  DSM: "America/Chicago",
  CID: "America/Chicago",
  MSP: "America/Chicago",
  STP: "America/Chicago",
  FCM: "America/Chicago",
  DAL: "America/Chicago",
  ADS: "America/Chicago",
  DFW: "America/Chicago",
  FTW: "America/Chicago",
  AUS: "America/Chicago",
  SAT: "America/Chicago",
  HOU: "America/Chicago",
  IAH: "America/Chicago",
  EFD: "America/Chicago",
  CXO: "America/Chicago",
  MSY: "America/Chicago",
  NEW: "America/Chicago",
  BTR: "America/Chicago",
  LIT: "America/Chicago",
  OKC: "America/Chicago",
  TUL: "America/Chicago",
  COS: "America/Denver",
  APA: "America/Denver",
  BJC: "America/Denver",
  DEN: "America/Denver",
  ASE: "America/Denver",
  EGE: "America/Denver",
  GJT: "America/Denver",
  PUB: "America/Denver",
  MTJ: "America/Denver",
  TEX: "America/Denver",
  HDN: "America/Denver",
  JAC: "America/Denver",
  SLC: "America/Denver",
  PVU: "America/Denver",
  ABQ: "America/Denver",
  SAF: "America/Denver",
  ELP: "America/Denver",
  BIL: "America/Denver",
  BZN: "America/Denver",
  GTF: "America/Denver",
  FCA: "America/Denver",
  HLN: "America/Denver",
  TWF: "America/Boise",
  BOI: "America/Boise",
  SNA: "America/Los_Angeles",
  LGB: "America/Los_Angeles",
  BUR: "America/Los_Angeles",
  VNY: "America/Los_Angeles",
  LAX: "America/Los_Angeles",
  SMO: "America/Los_Angeles",
  HHR: "America/Los_Angeles",
  CPM: "America/Los_Angeles",
  TOA: "America/Los_Angeles",
  SBA: "America/Los_Angeles",
  SBP: "America/Los_Angeles",
  SMX: "America/Los_Angeles",
  FAT: "America/Los_Angeles",
  BFL: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  OAK: "America/Los_Angeles",
  SJC: "America/Los_Angeles",
  SQL: "America/Los_Angeles",
  PAO: "America/Los_Angeles",
  HWD: "America/Los_Angeles",
  TRM: "America/Los_Angeles",
  PSP: "America/Los_Angeles",
  ONT: "America/Los_Angeles",
  CNO: "America/Los_Angeles",
  RAL: "America/Los_Angeles",
  SEE: "America/Los_Angeles",
  SDM: "America/Los_Angeles",
  SAN: "America/Los_Angeles",
  CRQ: "America/Los_Angeles",
  MYF: "America/Los_Angeles",
  BFI: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  RNT: "America/Los_Angeles",
  PAE: "America/Los_Angeles",
  PDX: "America/Los_Angeles",
  HIO: "America/Los_Angeles",
  TTD: "America/Los_Angeles",
  RNO: "America/Los_Angeles",
  MEV: "America/Los_Angeles",
  LAS: "America/Los_Angeles",
  VGT: "America/Los_Angeles",
  COE: "America/Los_Angeles",
  GEG: "America/Los_Angeles",
  SMF: "America/Los_Angeles",
  SAC: "America/Los_Angeles",
  TVC: "America/Detroit",
  DET: "America/Detroit",
  DTW: "America/Detroit",
  PTK: "America/Detroit",
  YIP: "America/Detroit",
  CLE: "America/New_York",
  BKL: "America/New_York",
  CAK: "America/New_York",
  CMH: "America/New_York",
  LCK: "America/New_York",
  DAY: "America/New_York",
  CVG: "America/New_York",
  IND: "America/Indiana/Indianapolis",
  BUF: "America/New_York",
  ROC: "America/New_York",
  SYR: "America/New_York",
  PIT: "America/New_York",
  AGC: "America/New_York",
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

/** Empty-leg departure: date + time in the given IANA zone. */
export function formatEmptyLegDateTime(
  iso: string,
  timeZone: string,
  opts?: { hour12?: boolean }
): string {
  const hour12 = opts?.hour12 ?? false;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: hour12 ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12,
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

/** Date-only fallback when departure timezone is unknown (never shows GMT). */
export function formatEmptyLegDepartureDateOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** Atlas inventory: departure-airport local, 24h (e.g. "Jul 10, 2026, 17:21 EDT"). */
export function formatEmptyLegDepartureLabel(
  iso: string,
  timeZone: string | null | undefined
): string {
  if (!timeZone || timeZone === "UTC") {
    return `${formatEmptyLegDepartureDateOnly(iso)} · timezone unknown`;
  }
  return `${formatEmptyLegDateTime(iso, timeZone, { hour12: false })} ${timezoneAbbr(iso, timeZone)}`;
}

/** Public lists/embed: departure-airport local, 12h AM/PM (e.g. "Jul 10, 2026, 5:21 PM EDT"). */
export function formatEmptyLegDepartureLabelPublic(
  iso: string,
  timeZone: string | null | undefined
): string {
  if (!timeZone || timeZone === "UTC") {
    return `${formatEmptyLegDepartureDateOnly(iso)} · Local time pending`;
  }
  return `${formatEmptyLegDateTime(iso, timeZone, { hour12: true })} ${timezoneAbbr(iso, timeZone)}`;
}

/** Short Zulu instant for tooltips / debugging only. */
export function formatEmptyLegUtcInstant(iso: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${time}Z`;
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
