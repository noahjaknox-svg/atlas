import type { PrismaClient } from "@prisma/client";
import { computeAvailabilityWindows } from "@/lib/schedule/compute-windows";
import { buildScheduleTimeline } from "@/lib/schedule/build-timeline";
import {
  collectIcaosFromSchedule,
  loadAirportTimezones,
} from "@/lib/schedule/airport-timezones";
export interface LoadTimelineOptions {
  rangeStart?: Date;
  rangeEnd?: Date;
  tailNumbers?: string[];
  sourceId?: string;
}

export async function loadScheduleTimeline(db: PrismaClient, opts: LoadTimelineOptions = {}) {
  const rangeStart = opts.rangeStart ?? new Date();
  const rangeEnd =
    opts.rangeEnd ?? new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const source = opts.sourceId
    ? await db.scheduleSource.findUnique({ where: { id: opts.sourceId } })
    : await db.scheduleSource.findFirst({ where: { enabled: true }, orderBy: { updatedAt: "desc" } });

  const fleet = await db.crewFleetAircraft.findMany({
    where: {
      status: "active",
      ...(opts.tailNumbers?.length ? { tailNumber: { in: opts.tailNumbers } } : {}),
    },
    include: { aircraftType: true },
  });

  const contextStart = new Date(rangeStart.getTime() - 90 * 24 * 60 * 60 * 1000);

  const events = await db.scheduleEvent.findMany({
    where: {
      deletedAt: null,
      ...(source ? { sourceId: source.id } : {}),
      ...(opts.tailNumbers?.length ? { tailNumber: { in: opts.tailNumbers } } : {}),
      endsAt: { gt: contextStart },
      startsAt: { lt: rangeEnd },
    },
    orderBy: { startsAt: "asc" },
  });

  // Include all tails seen in JetInsight, not only crew fleet
  const fleetByTail = new Map(fleet.map((f) => [f.tailNumber, f]));
  const allTailNumbers = Array.from(
    new Set([
      ...fleet.map((f) => f.tailNumber),
      ...events.map((e) => e.tailNumber),
    ])
  ).sort();

  const tails = allTailNumbers.map((tailNumber) => {
    const f = fleetByTail.get(tailNumber);
    return {
      tailNumber,
      homeBase: f?.homeBase ?? null,
      typeCode: f?.aircraftType.code ?? null,
      fleetAircraftId: f?.id ?? null,
    };
  });

  const windows = computeAvailabilityWindows({
    rangeStart,
    rangeEnd,
    tails,
    events,
  });

  const timezoneByIcao = await loadAirportTimezones(
    db,
    collectIcaosFromSchedule(tails, events)
  );

  const timeline = buildScheduleTimeline({
    rangeStart,
    rangeEnd,
    tails,
    events,
    windows,
    timezoneByIcao,
  });

  return {
    source,
    timeline,
    fleet: fleet.map((f) => ({
      tailNumber: f.tailNumber,
      homeBase: f.homeBase,
      typeCode: f.aircraftType.code,
      typeModel: `${f.aircraftType.manufacturer} ${f.aircraftType.model}`,
    })),
    eventCount: events.length,
  };
}
