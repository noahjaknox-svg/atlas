import type { PrismaClient, Prisma } from "@prisma/client";
import type { NormalizedScheduleEvent } from "@/lib/schedule/types";
import { parseIcsText } from "@/lib/schedule/parse-ics";

export interface SyncSourceResult {
  sourceId: string;
  eventsUpserted: number;
  eventsDeleted: number;
  unmatchedTails: string[];
}

export async function ensureScheduleSource(
  db: PrismaClient,
  opts: { name: string; icsUrl: string; pollIntervalMinutes?: number }
) {
  const existing = await db.scheduleSource.findFirst({
    where: { icsUrl: opts.icsUrl },
  });
  if (existing) return existing;

  return db.scheduleSource.create({
    data: {
      name: opts.name,
      icsUrl: opts.icsUrl,
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
  const res = await fetch(icsUrl, {
    headers: { Accept: "text/calendar" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS (${res.status})`);
  }
  const icsText = await res.text();
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
  const UPSERT_BATCH = 15;

  for (let i = 0; i < events.length; i += UPSERT_BATCH) {
    const batch = events.slice(i, i + UPSERT_BATCH);
    await Promise.all(
      batch.map(async (e) => {
        const tail = e.tailNumber?.toUpperCase();
        if (!tail) return;

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
      })
    );
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
