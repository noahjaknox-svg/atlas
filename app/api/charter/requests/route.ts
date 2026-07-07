import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { CharterRequestStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const params = new URL(request.url).searchParams;
    const status = params.get("status") as CharterRequestStatus | null;
    const id = params.get("id");

    if (id) {
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
          inboundMessage: { select: { id: true, subject: true, fromAddress: true } },
        },
      });
      return jsonOk(row);
    }

    const rows = await prisma.charterRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        legs: { orderBy: { legIndex: "asc" } },
        matches: {
          where: { recommended: true },
          take: 1,
        },
        createdBy: { select: { name: true } },
      },
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        tripType: r.tripType,
        source: r.source,
        requestedDepIcao: r.requestedDepIcao,
        requestedArrIcao: r.requestedArrIcao,
        requestedDepartAt: r.requestedDepartAt?.toISOString() ?? null,
        paxCount: r.paxCount,
        clientName: r.clientName,
        createdAt: r.createdAt.toISOString(),
        createdByName: r.createdBy?.name ?? null,
        legCount: r.legs.length,
        routeSummary: formatRouteSummary(r.legs, r.requestedDepIcao, r.requestedArrIcao),
        recommendedTail: r.matches[0]?.tailNumber ?? null,
        recommendedScore: r.matches[0] ? Number(r.matches[0].score) : null,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}

function formatRouteSummary(
  legs: { depIcao: string; arrIcao: string }[],
  dep: string | null,
  arr: string | null
): string {
  if (legs.length > 1) {
    return legs.map((l) => `${l.depIcao}→${l.arrIcao}`).join(" · ");
  }
  if (dep && arr) return `${dep} → ${arr}`;
  return "—";
}
