/** Common US charter airport timezones when not in Atlas airports table. */
const FALLBACK_TIMEZONES: Record<string, string> = {
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
  DAL: "America/Chicago",
  AUS: "America/Chicago",
  COS: "America/Denver",
  SLC: "America/Denver",
  HDN: "America/Denver",
  DEN: "America/Denver",
  BNA: "America/Chicago",
  CID: "America/Chicago",
  COE: "America/Los_Angeles",
  RNO: "America/Los_Angeles",
  HND: "America/Los_Angeles",
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

export function resolveRowTimezone(
  homeBase: string | null,
  timezoneByIcao: Record<string, string>
): { timezone: string; timezoneIcao: string | null } {
  if (!homeBase) return { timezone: "UTC", timezoneIcao: null };
  const icao = homeBase.toUpperCase();
  return {
    timezone: timezoneByIcao[icao] ?? "UTC",
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
  return timezoneByIcao[icao] ?? "UTC";
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

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function loadAirportTimezones(
  db: { airport: { findMany: (args: object) => Promise<{ icao: string; timezone: string | null }[]> } },
  icaos: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(icaos.map((c) => c.toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return { ...FALLBACK_TIMEZONES };

  const rows = await db.airport.findMany({
    where: { icao: { in: unique } },
    select: { icao: true, timezone: true },
  });

  const fromDb: Record<string, string | null> = {};
  for (const row of rows) {
    fromDb[row.icao.toUpperCase()] = row.timezone;
  }
  return mergeTimezoneMap(fromDb);
}

export function collectIcaosFromSchedule(
  tails: { homeBase: string | null }[],
  events: { depIcao: string | null; arrIcao: string | null; locationIcao: string | null }[]
): string[] {
  const icaos = new Set<string>();
  for (const t of tails) {
    if (t.homeBase) icaos.add(t.homeBase.toUpperCase());
  }
  for (const e of events) {
    if (e.depIcao) icaos.add(e.depIcao.toUpperCase());
    if (e.arrIcao) icaos.add(e.arrIcao.toUpperCase());
    if (e.locationIcao) icaos.add(e.locationIcao.toUpperCase());
  }
  return Array.from(icaos);
}
