import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { matchCharterRequest } from "@/lib/schedule/match-request";
import { persistMatchResults } from "@/lib/schedule/load-kanban";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;

    const request = await prisma.charterRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Not found", 404);

    if (!request.requestedDepIcao || !request.requestedArrIcao || !request.requestedDepartAt) {
      return jsonError("Request missing route or departure time", 400);
    }

    const [events, fleet] = await Promise.all([
      prisma.scheduleEvent.findMany({ where: { deletedAt: null } }),
      prisma.crewFleetAircraft.findMany({
        where: { status: "active" },
        select: { id: true, tailNumber: true, homeBase: true },
      }),
    ]);

    const matches = matchCharterRequest(
      {
        requestedDepIcao: request.requestedDepIcao,
        requestedArrIcao: request.requestedArrIcao,
        requestedDepartAt: request.requestedDepartAt,
        paxCount: request.paxCount,
      },
      events,
      fleet
    );

    await persistMatchResults(prisma, id, matches);

    const stored = await prisma.charterRequestMatch.findMany({
      where: { requestId: id },
      orderBy: { rank: "asc" },
    });

    return jsonOk({ requestId: id, matches: stored });
  } catch (e) {
    return handleApiError(e);
  }
}
