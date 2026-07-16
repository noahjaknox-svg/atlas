import type { PrismaClient, Prisma } from "@prisma/client";
import { computeAvailabilityWindows } from "@/lib/schedule/compute-windows";
import { buildKanbanBoard } from "@/lib/schedule/kanban";

export interface LoadKanbanOptions {
  rangeStart?: Date;
  rangeEnd?: Date;
  tailNumbers?: string[];
  sourceId?: string;
}

export async function loadScheduleKanban(db: PrismaClient, opts: LoadKanbanOptions = {}) {
  const rangeStart = opts.rangeStart ?? new Date();
  const rangeEnd =
    opts.rangeEnd ?? new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const source = opts.sourceId
    ? await db.scheduleSource.findUnique({ where: { id: opts.sourceId } })
    : await db.scheduleSource.findFirst({ where: { enabled: true }, orderBy: { updatedAt: "desc" } });

  const fleet = await db.aircraftTail.findMany({
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

  const fleetByTail = new Map(fleet.map((f) => [f.tailNumber, f]));
  const allTailNumbers = Array.from(
    new Set([...fleet.map((f) => f.tailNumber), ...events.map((e) => e.tailNumber)])
  ).sort();

  const tails = allTailNumbers.map((tailNumber) => {
    const f = fleetByTail.get(tailNumber);
    return {
      tailNumber,
      homeBase: f?.homeBase ?? null,
      fleetAircraftId: f?.id ?? null,
    };
  });

  const windows = computeAvailabilityWindows({
    rangeStart,
    rangeEnd,
    tails,
    events,
  });

  const board = buildKanbanBoard(events, windows);

  return {
    source,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    board,
    fleet: fleet.map((f) => ({
      tailNumber: f.tailNumber,
      homeBase: f.homeBase,
      typeCode: f.aircraftType.code,
      typeModel: `${f.aircraftType.manufacturer} ${f.aircraftType.model}`,
    })),
    eventCount: events.length,
  };
}

export async function persistMatchResults(
  db: PrismaClient,
  requestId: string,
  matches: {
    tailNumber: string;
    fleetAircraftId: string | null;
    score: number;
    rank: number;
    recommended: boolean;
    reasoning: object;
  }[]
) {
  await db.charterRequestMatch.deleteMany({ where: { requestId } });

  if (matches.length > 0) {
    await db.charterRequestMatch.createMany({
      data: matches.map((m) => ({
        requestId,
        tailNumber: m.tailNumber,
        fleetAircraftId: m.fleetAircraftId,
        score: m.score,
        rank: m.rank,
        recommended: m.recommended,
        reasoning: m.reasoning as Prisma.InputJsonValue,
      })),
    });
  }

  await db.charterRequest.update({
    where: { id: requestId },
    data: { status: "matched" },
  });
}
