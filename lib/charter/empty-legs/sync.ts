import { randomBytes } from "crypto";
import type {
  EmptyLegHistoryReason,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { airportCodesMatch } from "@/lib/airports/code-match";
import {
  buildRouteKey,
  durationMinutesBetween,
  isEligibleEmptyLegEvent,
} from "@/lib/charter/empty-legs/eligibility";
import {
  hasHardBlockOverlap,
  resolveEmptyLegAvailability,
  type HardBlockEvent,
} from "@/lib/charter/empty-legs/availability";

export type EmptyLegSyncStats = {
  emptyLegsCreated: number;
  emptyLegsUpdated: number;
  emptyLegsHistoried: number;
  placementsCreated: number;
  warnings: string[];
};

export type EmptyLegSyncProgress = {
  done: number;
  total: number;
  detail: string;
};

const SCHEDULE_EVENT_SYNC_SELECT = {
  id: true,
  externalUid: true,
  externalTripCode: true,
  externalUrl: true,
  tailNumber: true,
  depIcao: true,
  arrIcao: true,
  startsAt: true,
  endsAt: true,
  paxCount: true,
  summaryRaw: true,
  rawEventType: true,
  isHold: true,
  availabilityClass: true,
  deletedAt: true,
} satisfies Prisma.ScheduleEventSelect;

type SyncScheduleEvent = Prisma.ScheduleEventGetPayload<{
  select: typeof SCHEDULE_EVENT_SYNC_SELECT;
}>;

type EligibleSnapshot = {
  event: SyncScheduleEvent;
  tripNumber: string;
  routeKey: string;
  depIcao: string;
  arrIcao: string;
};

const WRITE_CONCURRENCY = 10;

function toEligible(event: SyncScheduleEvent): EligibleSnapshot | null {
  if (!isEligibleEmptyLegEvent(event)) return null;
  const depIcao = event.depIcao!.toUpperCase();
  const arrIcao = event.arrIcao!.toUpperCase();
  return {
    event,
    tripNumber: event.externalTripCode!.toUpperCase(),
    routeKey: buildRouteKey(depIcao, arrIcao),
    depIcao,
    arrIcao,
  };
}

function indexEventsByTail(events: SyncScheduleEvent[]): Map<string, HardBlockEvent[]> {
  const byTail = new Map<string, HardBlockEvent[]>();
  for (const event of events) {
    const tail = event.tailNumber.toUpperCase();
    const list = byTail.get(tail);
    if (list) list.push(event);
    else byTail.set(tail, [event]);
  }
  return byTail;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const run = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index]!, index);
    }
  };
  const n = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: n }, () => run()));
}

export async function syncEmptyLegsFromSchedule(
  db: PrismaClient,
  opts: {
    sourceId?: string;
    onProgress?: (progress: EmptyLegSyncProgress) => void;
  } = {}
): Promise<EmptyLegSyncStats> {
  const stats: EmptyLegSyncStats = {
    emptyLegsCreated: 0,
    emptyLegsUpdated: 0,
    emptyLegsHistoried: 0,
    placementsCreated: 0,
    warnings: [],
  };

  const events = await db.scheduleEvent.findMany({
    where: {
      deletedAt: null,
      ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
    },
    select: SCHEDULE_EVENT_SYNC_SELECT,
    orderBy: { startsAt: "asc" },
  });

  const eventsByTail = indexEventsByTail(events);
  const eventsById = new Map(events.map((e) => [e.id, e]));

  const eligible = events
    .map(toEligible)
    .filter((row): row is EligibleSnapshot => row != null);

  const eligibleByTripRoute = new Map<string, EligibleSnapshot>();
  const eligibleByTrip = new Map<string, EligibleSnapshot[]>();
  for (const row of eligible) {
    const key = `${row.tripNumber}::${row.routeKey}`;
    eligibleByTripRoute.set(key, row);
    const list = eligibleByTrip.get(row.tripNumber) ?? [];
    list.push(row);
    eligibleByTrip.set(row.tripNumber, list);
  }

  const [activeLegs, activeLists, fleetRows] = await Promise.all([
    db.emptyLeg.findMany({
      where: { lifecycleStatus: "active" },
    }),
    db.emptyLegPublicList.findMany({
      where: { isActive: true, tokenRevokedAt: null },
      select: {
        id: true,
        defaultPlacementStatus: true,
        defaultPricingMode: true,
        discountDisplayMode: true,
      },
    }),
    db.aircraftTail.findMany({
      include: {
        aircraftType: {
          select: { manufacturer: true, model: true, displayName: true },
        },
      },
    }),
  ]);

  const fleetByTail = new Map<string, { id: string; typeLabel: string }>();
  for (const fleet of fleetRows) {
    const combined = [fleet.aircraftType.manufacturer, fleet.aircraftType.model]
      .filter(Boolean)
      .join(" ")
      .trim();
    fleetByTail.set(fleet.tailNumber.toUpperCase(), {
      id: fleet.id,
      typeLabel: combined || fleet.aircraftType.displayName,
    });
  }

  const now = new Date();
  const activeByTripRoute = new Map<
    string,
    (typeof activeLegs)[number]
  >(activeLegs.map((leg) => [`${leg.tripNumber}::${leg.routeKey}`, leg]));

  type HistorifyJob = { id: string; reason: EmptyLegHistoryReason };
  const toHistorify: HistorifyJob[] = [];

  for (const leg of activeLegs) {
    const key = `${leg.tripNumber}::${leg.routeKey}`;
    if (eligibleByTripRoute.has(key)) continue;

    const sameTrip = eligibleByTrip.get(leg.tripNumber) ?? [];
    let reason: EmptyLegHistoryReason =
      sameTrip.length > 0 ? "route_changed" : "trip_removed";

    const sourceEvent =
      (leg.sourceScheduleEventId
        ? eventsById.get(leg.sourceScheduleEventId) ?? null
        : null) ??
      events.find(
        (e) =>
          e.externalTripCode?.toUpperCase() === leg.tripNumber.toUpperCase() &&
          airportCodesMatch(e.depIcao, leg.depIcao) &&
          airportCodesMatch(e.arrIcao, leg.arrIcao)
      ) ??
      events.find(
        (e) => e.externalTripCode?.toUpperCase() === leg.tripNumber.toUpperCase()
      );
    if (sourceEvent && (sourceEvent.isHold || sourceEvent.availabilityClass === "soft_hold")) {
      reason = "unbooked_hold";
    }

    toHistorify.push({ id: leg.id, reason });
    activeByTripRoute.delete(key);
  }

  const totalSteps = Math.max(1, toHistorify.length + eligible.length);
  let doneSteps = 0;
  const report = (detail: string) => {
    opts.onProgress?.({
      done: doneSteps,
      total: totalSteps,
      detail,
    });
  };
  report(
    toHistorify.length > 0
      ? `Historifying ${toHistorify.length} stale empty legs…`
      : `Processing ${eligible.length} empty legs…`
  );

  await mapPool(toHistorify, WRITE_CONCURRENCY, async (job) => {
    await db.emptyLeg.update({
      where: { id: job.id },
      data: {
        lifecycleStatus: "history",
        historyReason: job.reason,
        lastSyncedAt: now,
      },
    });
    stats.emptyLegsHistoried++;
    doneSteps++;
    if (doneSteps % 5 === 0 || doneSteps === toHistorify.length) {
      report(`Historifying empty legs ${doneSteps}/${totalSteps}…`);
    }
  });

  const placementKey = (emptyLegId: string, publicListId: string) =>
    `${emptyLegId}::${publicListId}`;

  const existingPlacementRows =
    activeByTripRoute.size > 0 && activeLists.length > 0
      ? await db.emptyLegPlacement.findMany({
          where: {
            emptyLegId: { in: Array.from(activeByTripRoute.values()).map((l) => l.id) },
            publicListId: { in: activeLists.map((l) => l.id) },
          },
          select: { emptyLegId: true, publicListId: true },
        })
      : [];

  const knownPlacements = new Set(
    existingPlacementRows.map((p) => placementKey(p.emptyLegId, p.publicListId))
  );

  type PlacementCreate = {
    emptyLegId: string;
    publicListId: string;
    status: (typeof activeLists)[number]["defaultPlacementStatus"];
    pricingMode: (typeof activeLists)[number]["defaultPricingMode"];
    displayDiscountMode: (typeof activeLists)[number]["discountDisplayMode"];
  };
  const placementsToCreate: PlacementCreate[] = [];

  await mapPool(eligible, WRITE_CONCURRENCY, async (row) => {
    const key = `${row.tripNumber}::${row.routeKey}`;
    const existing = activeByTripRoute.get(key) ?? null;
    const tail = row.event.tailNumber.toUpperCase();
    const fleet = fleetByTail.get(tail);
    const aircraftType = fleet?.typeLabel ?? existing?.aircraftType ?? null;
    const aircraftTailId = fleet?.id ?? existing?.aircraftTailId ?? null;

    const calendarBlocked = hasHardBlockOverlap({
      emptyLegEventId: row.event.id,
      tailNumber: tail,
      startsAt: row.event.startsAt,
      endsAt: row.event.endsAt,
      events: eventsByTail.get(tail) ?? [],
    });

    const forceState = existing?.forceState ?? null;
    const availabilityStatus = resolveEmptyLegAvailability({
      forceState,
      calendarBlocked,
    });

    const durationMinutes = durationMinutesBetween(row.event.startsAt, row.event.endsAt);
    const baseData = {
      tripNumber: row.tripNumber,
      routeKey: row.routeKey,
      depIcao: row.depIcao,
      arrIcao: row.arrIcao,
      tailNumber: tail,
      aircraftTailId,
      aircraftType,
      sourceScheduleEventId: row.event.id,
      sourceIcalUid: row.event.externalUid,
      sourceJetInsightUrl: row.event.externalUrl,
      scheduledDepartureAt: row.event.startsAt,
      scheduledArrivalAt: row.event.endsAt,
      durationMinutes,
      lastSyncedAt: now,
      availabilityStatus,
      lifecycleStatus: "active" as const,
      historyReason: null,
    };

    let emptyLegId: string;
    if (existing) {
      await db.emptyLeg.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          forceState: existing.forceState,
          forceAppliedByUserId: existing.forceAppliedByUserId,
          forceAppliedAt: existing.forceAppliedAt,
        },
      });
      emptyLegId = existing.id;
      stats.emptyLegsUpdated++;
      // Refresh cached row availability for any later logic.
      existing.availabilityStatus = availabilityStatus;
    } else {
      const created = await db.emptyLeg.create({
        data: baseData,
      });
      emptyLegId = created.id;
      stats.emptyLegsCreated++;
      activeByTripRoute.set(key, created);
    }

    for (const list of activeLists) {
      const keyP = placementKey(emptyLegId, list.id);
      if (knownPlacements.has(keyP)) continue;
      knownPlacements.add(keyP);
      placementsToCreate.push({
        emptyLegId,
        publicListId: list.id,
        status: list.defaultPlacementStatus,
        pricingMode: list.defaultPricingMode,
        displayDiscountMode: list.discountDisplayMode,
      });
    }

    doneSteps++;
    if (doneSteps % 5 === 0 || doneSteps === totalSteps) {
      report(`Empty legs ${doneSteps}/${totalSteps}…`);
    }
  });

  if (placementsToCreate.length > 0) {
    // createMany in chunks — skipDuplicates guards races across concurrency.
    for (let i = 0; i < placementsToCreate.length; i += 100) {
      const chunk = placementsToCreate.slice(i, i + 100);
      const result = await db.emptyLegPlacement.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      stats.placementsCreated += result.count;
    }
  }

  // Availability already set on create/update for this run. Only refresh
  // active legs that were not touched as eligible this pass (e.g. forced).
  const eligibleKeys = new Set(eligible.map((r) => `${r.tripNumber}::${r.routeKey}`));
  const staleActive = Array.from(activeByTripRoute.entries()).filter(
    ([key]) => !eligibleKeys.has(key)
  );

  await mapPool(staleActive, WRITE_CONCURRENCY, async ([, leg]) => {
    const tail = leg.tailNumber.toUpperCase();
    const calendarBlocked = hasHardBlockOverlap({
      emptyLegEventId: leg.sourceScheduleEventId,
      tailNumber: tail,
      startsAt: leg.scheduledDepartureAt,
      endsAt: leg.scheduledArrivalAt,
      events: eventsByTail.get(tail) ?? [],
    });
    const availabilityStatus = resolveEmptyLegAvailability({
      forceState: leg.forceState,
      calendarBlocked,
    });
    if (availabilityStatus !== leg.availabilityStatus) {
      await db.emptyLeg.update({
        where: { id: leg.id },
        data: { availabilityStatus, lastSyncedAt: now },
      });
    }
  });

  report(`Empty legs ${totalSteps}/${totalSteps}…`);

  await db.emptyLegSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      lastCharterSyncAt: now,
      lastCharterSyncStatus: "ok",
      lastCharterSyncStatsJson: stats as unknown as Prisma.InputJsonValue,
    },
    update: {
      lastCharterSyncAt: now,
      lastCharterSyncStatus: "ok",
      lastCharterSyncStatsJson: stats as unknown as Prisma.InputJsonValue,
    },
  });

  return stats;
}

export function createPublicListToken(): string {
  return randomBytes(24).toString("base64url");
}
