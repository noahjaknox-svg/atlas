import type { PrismaClient, Prisma } from "@prisma/client";
import type { NormalizedScheduleEvent } from "@/lib/schedule/types";
import { parseIcsText } from "@/lib/schedule/parse-ics";
import {
  syncEmptyLegsFromSchedule,
  type EmptyLegSyncStats,
} from "@/lib/charter/empty-legs/sync";
import type { SyncProgress } from "@/lib/schedule/sync-poll";

export {
  SYNC_POLL_OPTIONS,
  normalizePollIntervalMinutes,
  pollIntervalLabel,
  shouldRunScheduledSync,
  type SyncPollMinutes,
  type SyncProgress,
  type SyncProgressPhase,
} from "@/lib/schedule/sync-poll";

export interface SyncSourceResult {
  sourceId: string;
  eventsUpserted: number;
  eventsDeleted: number;
  unmatchedTails: string[];
  emptyLegs: EmptyLegSyncStats;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

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
      // Default Never — auto-sync only after an admin chooses Hourly/Daily.
      pollIntervalMinutes: opts.pollIntervalMinutes ?? 0,
    },
  });
}

export async function syncScheduleSource(
  db: PrismaClient,
  sourceId: string,
  icsText: string,
  onProgress?: SyncProgressCallback
): Promise<SyncSourceResult> {
  const report = (progress: SyncProgress) => {
    onProgress?.(progress);
  };

  const run = await db.scheduleSyncRun.create({
    data: { sourceId },
  });

  try {
    report({ phase: "parse", percent: 10, detail: "Parsing calendar…" });
    const normalized = await parseIcsText(icsText);
    report({
      phase: "parse",
      percent: 15,
      detail: `Parsed ${normalized.length} events`,
    });

    const fleetByTail = await loadFleetMap(db);
    const { upserted, unmatchedTails } = await upsertEvents(
      db,
      sourceId,
      normalized,
      fleetByTail,
      (done, total) => {
        const pct = total === 0 ? 80 : 15 + Math.round((done / total) * 65);
        report({
          phase: "upsert",
          percent: Math.min(80, pct),
          detail: `Updating events ${done}/${total}…`,
        });
      }
    );

    report({ phase: "tombstone", percent: 85, detail: "Removing stale events…" });
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

    report({ phase: "empty_legs", percent: 90, detail: "Processing empty legs…" });
    const emptyLegs = await syncEmptyLegsFromSchedule(db, { sourceId });

    report({ phase: "done", percent: 100, detail: "Sync complete" });

    return {
      sourceId,
      eventsUpserted: upserted,
      eventsDeleted: deleted,
      unmatchedTails,
      emptyLegs,
    };
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
  icsUrl: string,
  onProgress?: SyncProgressCallback
): Promise<SyncSourceResult> {
  onProgress?.({ phase: "fetch", percent: 2, detail: "Fetching calendar…" });
  const res = await fetch(icsUrl, {
    headers: { Accept: "text/calendar" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS (${res.status})`);
  }
  const icsText = await res.text();
  onProgress?.({ phase: "fetch", percent: 8, detail: "Calendar downloaded" });
  return syncScheduleSource(db, sourceId, icsText, onProgress);
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
  fleetByTail: Map<string, string>,
  onBatch?: (done: number, total: number) => void
) {
  let upserted = 0;
  const unmatched = new Set<string>();
  const UPSERT_BATCH = 15;
  const total = events.length;

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
    onBatch?.(Math.min(i + UPSERT_BATCH, total), total);
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
