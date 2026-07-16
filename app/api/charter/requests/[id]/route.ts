import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { matchCharterRequest, matchCharterLegs } from "@/lib/schedule/match-request";
import { persistMatchResults } from "@/lib/schedule/load-kanban";
import type { CharterRequestStatus } from "@prisma/client";

const VALID_STATUSES = new Set<CharterRequestStatus>([
  "new",
  "parsed",
  "matched",
  "quoted",
  "sent_to_jetinsight",
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;

    const row = await prisma.charterRequest.findUnique({
      where: { id },
      include: {
        legs: { orderBy: { legIndex: "asc" } },
        matches: {
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
        },
        createdBy: { select: { name: true, email: true } },
        inboundMessage: { select: { id: true, subject: true, fromAddress: true, bodyText: true } },
      },
    });

    if (!row) return jsonError("Not found", 404);
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = (await request.json()) as { status?: CharterRequestStatus; action?: string };

    const existing = await prisma.charterRequest.findUnique({
      where: { id },
      include: { legs: { orderBy: { legIndex: "asc" } } },
    });
    if (!existing) return jsonError("Not found", 404);

    if (body.action === "rematch") {
      if (!existing.requestedDepIcao || !existing.requestedArrIcao || !existing.requestedDepartAt) {
        return jsonError("Request missing route or departure time", 400);
      }

      const [events, fleetRows] = await Promise.all([
        prisma.scheduleEvent.findMany({ where: { deletedAt: null } }),
        prisma.aircraftTail.findMany({
          where: { status: "active" },
          include: {
            aircraftType: {
              select: { manufacturer: true, model: true, maxPassengers: true },
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

      const legInputs =
        existing.legs.length > 0
          ? existing.legs.map((leg) => ({
              depIcao: leg.depIcao,
              arrIcao: leg.arrIcao,
              requestedDepartAt: leg.departAt ?? existing.requestedDepartAt!,
            }))
          : [
              {
                depIcao: existing.requestedDepIcao,
                arrIcao: existing.requestedArrIcao,
                requestedDepartAt: existing.requestedDepartAt,
              },
            ];

      const matches =
        legInputs.length > 1
          ? matchCharterLegs(legInputs, events, fleet, existing.paxCount)
          : matchCharterRequest(
              {
                requestedDepIcao: existing.requestedDepIcao,
                requestedArrIcao: existing.requestedArrIcao,
                requestedDepartAt: existing.requestedDepartAt,
                paxCount: existing.paxCount,
              },
              events,
              fleet
            );

      await persistMatchResults(prisma, id, matches);
    } else if (body.status) {
      if (!VALID_STATUSES.has(body.status)) {
        return jsonError("Invalid status", 400);
      }
      await prisma.charterRequest.update({
        where: { id },
        data: { status: body.status },
      });
    } else {
      return jsonError("No valid update provided", 400);
    }

    const updated = await prisma.charterRequest.findUnique({
      where: { id },
      include: {
        legs: { orderBy: { legIndex: "asc" } },
        matches: { orderBy: { rank: "asc" } },
      },
    });

    return jsonOk(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
