import type { PrismaClient, ScheduleEvent } from "@prisma/client";
import type { CharterTripType } from "@prisma/client";
import { matchCharterLegs, type FleetAircraftInput } from "@/lib/schedule/match-request";
import { persistMatchResults } from "@/lib/schedule/load-kanban";
import type { TripLegInput, TripMatchInput } from "@/lib/charter/types";

function parseDepartAt(leg: TripLegInput): Date {
  if (leg.timeTbd || !leg.departAt) {
    return new Date(new Date().toISOString().slice(0, 10) + "T12:00:00.000Z");
  }
  return new Date(leg.departAt);
}

function inferHomeBaseFromSchedule(events: ScheduleEvent[], tailNumber: string): string | null {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.tailNumber !== tailNumber) continue;
    for (const code of [event.arrIcao, event.locationIcao, event.depIcao]) {
      if (!code) continue;
      counts.set(code.toUpperCase(), (counts.get(code.toUpperCase()) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [code, count] of Array.from(counts.entries())) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  return best;
}

function buildMatchFleet(
  fleetRows: Awaited<ReturnType<typeof loadActiveFleet>>,
  events: ScheduleEvent[]
): FleetAircraftInput[] {
  const byTail = new Map(fleetRows.map((ac) => [ac.tailNumber, ac]));
  const tailNumbers = Array.from(
    new Set([...fleetRows.map((ac) => ac.tailNumber), ...events.map((e) => e.tailNumber)])
  ).sort();

  return tailNumbers.map((tailNumber) => {
    const ac = byTail.get(tailNumber);
    return {
      tailNumber,
      id: ac?.id ?? null,
      homeBase: ac?.homeBase ?? inferHomeBaseFromSchedule(events, tailNumber),
      maxPassengers: ac?.aircraftType.maxPassengers ?? null,
      aircraftTypeLabel: ac
        ? `${ac.aircraftType.manufacturer} ${ac.aircraftType.model}`
        : null,
    };
  });
}

async function loadActiveFleet(db: PrismaClient) {
  return db.aircraftTail.findMany({
    where: { status: "active" },
    include: {
      aircraftType: {
        select: {
          manufacturer: true,
          model: true,
          maxPassengers: true,
        },
      },
    },
  });
}

export async function runTripMatch(
  db: PrismaClient,
  input: TripMatchInput,
  createdById: string
) {
  const firstLeg = input.legs[0];
  if (!firstLeg) {
    throw new Error("At least one leg is required");
  }

  const request = await db.charterRequest.create({
    data: {
      tripType: input.tripType as CharterTripType,
      source: "manual",
      flightCategory: input.flightCategory,
      requestedDepIcao: firstLeg.depIcao.toUpperCase(),
      requestedArrIcao: firstLeg.arrIcao.toUpperCase(),
      requestedDepartAt: parseDepartAt(firstLeg),
      paxCount: input.paxCount,
      clientName: input.clientName ?? null,
      notes: input.notes ?? null,
      createdById,
      status: "new",
      legs: {
        create: input.legs.map((leg, legIndex) => ({
          legIndex,
          depIcao: leg.depIcao.toUpperCase(),
          arrIcao: leg.arrIcao.toUpperCase(),
          departAt: leg.departAt ? parseDepartAt(leg) : null,
          timeTbd: leg.timeTbd,
          departPref: leg.departPref,
        })),
      },
    },
    include: { legs: { orderBy: { legIndex: "asc" } } },
  });

  const [events, fleetRows] = await Promise.all([
    db.scheduleEvent.findMany({
      where: { deletedAt: null },
      orderBy: { startsAt: "asc" },
    }),
    loadActiveFleet(db),
  ]);

  const fleet = buildMatchFleet(fleetRows, events);

  const legInputs = input.legs.map((leg) => ({
    depIcao: leg.depIcao,
    arrIcao: leg.arrIcao,
    requestedDepartAt: parseDepartAt(leg),
  }));

  const matches = matchCharterLegs(legInputs, events, fleet, input.paxCount);

  await persistMatchResults(db, request.id, matches);

  const stored = await db.charterRequestMatch.findMany({
    where: { requestId: request.id },
    orderBy: { rank: "asc" },
    include: {
      fleetAircraft: {
        include: {
          aircraftType: {
            select: { manufacturer: true, model: true, maxPassengers: true },
          },
        },
      },
    },
  });

  return {
    requestId: request.id,
    request,
    matches: stored.map((m) => ({
      id: m.id,
      tailNumber: m.tailNumber,
      fleetAircraftId: m.fleetAircraftId,
      aircraftType: m.fleetAircraft
        ? `${m.fleetAircraft.aircraftType.manufacturer} ${m.fleetAircraft.aircraftType.model}`
        : null,
      maxPassengers: m.fleetAircraft?.aircraftType.maxPassengers ?? null,
      score: Number(m.score),
      rank: m.rank,
      recommended: m.recommended,
      reasoning: m.reasoning,
    })),
  };
}
