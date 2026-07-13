import { randomBytes } from "crypto";
import type {
  EmptyLegHistoryReason,
  Prisma,
  PrismaClient,
  ScheduleEvent,
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
} from "@/lib/charter/empty-legs/availability";

export type EmptyLegSyncStats = {
  emptyLegsCreated: number;
  emptyLegsUpdated: number;
  emptyLegsHistoried: number;
  placementsCreated: number;
  warnings: string[];
};

type EligibleSnapshot = {
  event: ScheduleEvent;
  tripNumber: string;
  routeKey: string;
  depIcao: string;
  arrIcao: string;
};

function toEligible(event: ScheduleEvent): EligibleSnapshot | null {
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

async function resolveAircraftType(
  db: PrismaClient,
  tailNumber: string
): Promise<string | null> {
  const fleet = await db.crewFleetAircraft.findUnique({
    where: { tailNumber },
    include: { aircraftType: { select: { manufacturer: true, model: true } } },
  });
  if (!fleet) return null;
  return `${fleet.aircraftType.manufacturer} ${fleet.aircraftType.model}`;
}

export async function syncEmptyLegsFromSchedule(
  db: PrismaClient,
  opts: { sourceId?: string } = {}
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
    orderBy: { startsAt: "asc" },
  });

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

  const activeLegs = await db.emptyLeg.findMany({
    where: { lifecycleStatus: "active" },
  });

  const now = new Date();
  const seenActiveKeys = new Set<string>();

  // Route changes / removals / HOLD (unbooked) for existing active legs
  for (const leg of activeLegs) {
    const key = `${leg.tripNumber}::${leg.routeKey}`;
    const match = eligibleByTripRoute.get(key);
    if (match) {
      seenActiveKeys.add(key);
      continue;
    }

    const sameTrip = eligibleByTrip.get(leg.tripNumber) ?? [];
    let reason: EmptyLegHistoryReason =
      sameTrip.length > 0 ? "route_changed" : "trip_removed";

    // Prefer a clearer reason when the source event still exists but is HOLD/unbooked.
    const sourceEvent =
      (leg.sourceScheduleEventId
        ? events.find((e) => e.id === leg.sourceScheduleEventId)
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

    await db.emptyLeg.update({
      where: { id: leg.id },
      data: {
        lifecycleStatus: "history",
        historyReason: reason,
        lastSyncedAt: now,
      },
    });
    stats.emptyLegsHistoried++;
  }

  const activeLists = await db.emptyLegPublicList.findMany({
    where: { isActive: true, tokenRevokedAt: null },
    select: {
      id: true,
      defaultPlacementStatus: true,
      defaultPricingMode: true,
      discountDisplayMode: true,
    },
  });

  // Create / update from eligible events
  for (const row of eligible) {
    const key = `${row.tripNumber}::${row.routeKey}`;
    seenActiveKeys.add(key);

    const existing = await db.emptyLeg.findFirst({
      where: {
        tripNumber: row.tripNumber,
        routeKey: row.routeKey,
        lifecycleStatus: "active",
      },
    });

    const aircraftType =
      (await resolveAircraftType(db, row.event.tailNumber)) ??
      existing?.aircraftType ??
      null;

    const calendarBlocked = hasHardBlockOverlap({
      emptyLegEventId: row.event.id,
      tailNumber: row.event.tailNumber,
      startsAt: row.event.startsAt,
      endsAt: row.event.endsAt,
      events,
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
      tailNumber: row.event.tailNumber.toUpperCase(),
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
    } else {
      const created = await db.emptyLeg.create({
        data: baseData,
      });
      emptyLegId = created.id;
      stats.emptyLegsCreated++;
    }

    for (const list of activeLists) {
      const placement = await db.emptyLegPlacement.findUnique({
        where: {
          emptyLegId_publicListId: {
            emptyLegId,
            publicListId: list.id,
          },
        },
      });
      if (placement) continue;
      await db.emptyLegPlacement.create({
        data: {
          emptyLegId,
          publicListId: list.id,
          status: list.defaultPlacementStatus,
          pricingMode: list.defaultPricingMode,
          displayDiscountMode: list.discountDisplayMode,
        },
      });
      stats.placementsCreated++;
    }
  }

  // Refresh availability for all remaining active legs (force-aware)
  const refreshed = await db.emptyLeg.findMany({
    where: { lifecycleStatus: "active" },
  });
  for (const leg of refreshed) {
    const calendarBlocked = hasHardBlockOverlap({
      emptyLegEventId: leg.sourceScheduleEventId,
      tailNumber: leg.tailNumber,
      startsAt: leg.scheduledDepartureAt,
      endsAt: leg.scheduledArrivalAt,
      events,
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
  }

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
