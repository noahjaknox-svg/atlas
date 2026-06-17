import type { PrismaClient, Prisma } from "@prisma/client";
import type { NormalizedScheduleEvent } from "@/lib/schedule/types";
import { parseIcsText } from "@/lib/schedule/parse-ics";

export interface SyncSourceResult {
  sourceId: string;
  eventsUpserted: number;
  eventsDeleted: number;
  unmatchedTails: string[];
}

/**
 * JetInsight "Subscribe" links are commonly `webcal://`, which the runtime
 * `fetch()` cannot handle. Normalize to https so the feed is reachable.
 */
export function normalizeIcsUrl(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

export async function ensureScheduleSource(
  db: PrismaClient,
  opts: { name: string; icsUrl: string; pollIntervalMinutes?: number }
) {
  const icsUrl = normalizeIcsUrl(opts.icsUrl);
  const existing = await db.scheduleSource.findFirst({
    where: { icsUrl },
  });
  if (existing) return existing;

  return db.scheduleSource.create({
    data: {
      name: opts.name,
      icsUrl,
      pollIntervalMinutes: opts.pollIntervalMinutes ?? 10,
    },
  });
}

export async function syncScheduleSource(
  db: PrismaClient,
  sourceId: string,
  icsText: string
): Promise<SyncSourceResult> {
  const run = await db.scheduleSyncRun.create({
    data: { sourceId },
  });

  try {
    const normalized = await parseIcsText(icsText);
    const fleetByTail = await loadFleetMap(db);
    const { upserted, unmatchedTails } = await upsertEvents(
      db,
      sourceId,
      normalized,
      fleetByTail
    );
    const deleted = await tombstoneMissingEvents(db, sourceId, normalized);

    await db.scheduleSyncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        eventsUpserted: upserted,
        eventsDeleted: deleted,
      },
    });

    await db.scheduleSource.update({
      where: { id: sourceId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "ok",
      },
    });

    return { sourceId, eventsUpserted: upserted, eventsDeleted: deleted, unmatchedTails };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await db.scheduleSyncRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), errorMessage: message },
    });
    await db.scheduleSource.update({
      where: { id: sourceId },
      data: { lastSyncStatus: `error: ${message}` },
    });
    throw err;
  }
}

export async function fetchAndSyncScheduleSource(
  db: PrismaClient,
  sourceId: string,
  icsUrl: string
): Promise<SyncSourceResult> {
  const url = normalizeIcsUrl(icsUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        // Some calendar exports reject requests without a UA / Accept header.
        Accept: "text/calendar, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": "Atlas-Schedule-Sync/1.0",
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not reach the ICS URL: ${detail}`);
  }

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 160).replace(/\s+/g, " ").trim();
    throw new Error(
      `ICS fetch failed (${res.status} ${res.statusText})${body ? ` — ${body}` : ""}`
    );
  }

  const icsText = await res.text();
  if (!icsText.includes("BEGIN:VCALENDAR")) {
    const snippet = icsText.trim().slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      snippet
        ? `ICS URL did not return a calendar (got "${snippet}…"). Confirm JETINSIGHT_ICS_URL points to the raw .ics export and the token is still valid.`
        : "ICS URL returned an empty response. Confirm JETINSIGHT_ICS_URL is correct and the token is still valid."
    );
  }

  return syncScheduleSource(db, sourceId, icsText);
}

async function loadFleetMap(db: PrismaClient) {
  const fleet = await db.crewFleetAircraft.findMany({
    where: { status: "active" },
    select: { id: true, tailNumber: true },
  });
  return new Map(fleet.map((f) => [f.tailNumber.toUpperCase(), f.id]));
}

async function upsertEvents(
  db: PrismaClient,
  sourceId: string,
  events: NormalizedScheduleEvent[],
  fleetByTail: Map<string, string>
) {
  let upserted = 0;
  const unmatched = new Set<string>();

  for (const e of events) {
    const tail = e.tailNumber?.toUpperCase();
    if (!tail) continue;

    const fleetAircraftId = fleetByTail.get(tail) ?? null;
    if (!fleetAircraftId) unmatched.add(tail);

    await db.scheduleEvent.upsert({
      where: {
        sourceId_externalUid: { sourceId, externalUid: e.externalUid },
      },
      create: eventData(sourceId, e, tail, fleetAircraftId),
      update: {
        ...eventData(sourceId, e, tail, fleetAircraftId),
        deletedAt: null,
      },
    });
    upserted++;
  }

  return { upserted, unmatchedTails: Array.from(unmatched).sort() };
}

function eventData(
  sourceId: string,
  e: NormalizedScheduleEvent,
  tailNumber: string,
  fleetAircraftId: string | null
) {
  return {
    sourceId,
    externalUid: e.externalUid,
    externalTripCode: e.externalTripCode,
    externalUrl: e.externalUrl,
    tailNumber,
    fleetAircraftId,
    depIcao: e.depIcao,
    arrIcao: e.arrIcao,
    locationIcao: e.locationIcao,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    lastModifiedAt: e.lastModifiedAt,
    clientLabel: e.clientLabel,
    paxCount: e.paxCount,
    picName: e.picName,
    sicName: e.sicName,
    cabinCrew: e.cabinCrew,
    summaryRaw: e.summaryRaw,
    descriptionRaw: e.descriptionRaw,
    rawEventType: e.rawEventType,
    isHold: e.isHold,
    isAdminBlock: e.isAdminBlock,
    availabilityClass: e.availabilityClass,
    rawIcs: e.rawIcs as Prisma.InputJsonValue,
  };
}

async function tombstoneMissingEvents(
  db: PrismaClient,
  sourceId: string,
  events: NormalizedScheduleEvent[]
) {
  const activeUids = events.map((e) => e.externalUid);
  const result = await db.scheduleEvent.updateMany({
    where: {
      sourceId,
      deletedAt: null,
      externalUid: { notIn: activeUids },
    },
    data: { deletedAt: new Date() },
  });
  return result.count;
}
