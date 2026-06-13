import ical from "node-ical";
import type { ParsedIcsEvent } from "@/lib/schedule/types";
import { normalizeScheduleEvent } from "@/lib/schedule/normalize-event";
import type { NormalizedScheduleEvent } from "@/lib/schedule/types";

function toDate(value: Date | { toJSDate?: () => Date } | string | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toJSDate" in value && typeof value.toJSDate === "function") {
    return value.toJSDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractTripCode(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/trips\/([A-Z0-9]+)/i);
  return match?.[1] ?? null;
}

function eventToRecord(event: ical.VEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(event)) {
    if (key.startsWith("_")) continue;
    out[key] = val instanceof Date ? val.toISOString() : val;
  }
  return out;
}

/** Parse raw ICS text into normalized schedule events. */
export async function parseIcsText(icsText: string): Promise<NormalizedScheduleEvent[]> {
  const parsed = ical.parseICS(icsText);
  const events: NormalizedScheduleEvent[] = [];

  for (const item of Object.values(parsed)) {
    if (!item || item.type !== "VEVENT") continue;
    const event = item as ical.VEvent;
    const startsAt = toDate(event.start);
    const endsAt = toDate(event.end);
    if (!startsAt || !endsAt || !event.uid) continue;

    const url =
      typeof event.url === "string"
        ? event.url
        : typeof event.url === "object" && event.url && "val" in event.url
          ? String((event.url as { val: string }).val)
          : null;

    const icsEvent: ParsedIcsEvent = {
      externalUid: String(event.uid),
      startsAt,
      endsAt,
      lastModifiedAt: toDate(event.lastmodified),
      locationIcao: event.location ? String(event.location).trim().toUpperCase() : null,
      summaryRaw: event.summary ? String(event.summary) : "",
      descriptionRaw: event.description ? String(event.description) : null,
      externalUrl: url,
      externalTripCode: extractTripCode(url ?? undefined),
      rawIcs: eventToRecord(event),
    };

    events.push(normalizeScheduleEvent(icsEvent));
  }

  return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
