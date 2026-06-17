import type { PrismaClient } from "@prisma/client";
import type { CharterTripType } from "@prisma/client";
import { matchCharterLegs } from "@/lib/schedule/match-request";
import { persistMatchResults } from "@/lib/schedule/load-kanban";
import type { TripLegInput, TripMatchInput } from "@/lib/charter/types";

function parseDepartAt(leg: TripLegInput): Date {
  if (leg.timeTbd || !leg.departAt) {
    return new Date(new Date().toISOString().slice(0, 10) + "T12:00:00.000Z");
  }
  return new Date(leg.departAt);
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
    db.crewFleetAircraft.findMany({
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
    }),
  ]);

  const fleet = fleetRows.map((ac) => ({
    tailNumber: ac.tailNumber,
    id: ac.id,
    homeBase: ac.homeBase,
    maxPassengers: ac.aircraftType.maxPassengers,
    aircraftTypeLabel: `${ac.aircraftType.manufacturer} ${ac.aircraftType.model}`,
  }));

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
