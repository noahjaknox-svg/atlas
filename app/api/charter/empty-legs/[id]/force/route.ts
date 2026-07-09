import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { emptyLegListInclude, serializeEmptyLeg } from "@/lib/charter/empty-legs/serialize";
import {
  hasHardBlockOverlap,
  resolveEmptyLegAvailability,
} from "@/lib/charter/empty-legs/availability";
import type { EmptyLegForceState } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = (await request.json()) as { forceState?: EmptyLegForceState | null };

    const existing = await prisma.emptyLeg.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const forceState =
      body.forceState === "force_available" || body.forceState === "force_unavailable"
        ? body.forceState
        : null;

    const events = await prisma.scheduleEvent.findMany({
      where: { deletedAt: null, tailNumber: existing.tailNumber },
    });
    const calendarBlocked = hasHardBlockOverlap({
      emptyLegEventId: existing.sourceScheduleEventId,
      tailNumber: existing.tailNumber,
      startsAt: existing.scheduledDepartureAt,
      endsAt: existing.scheduledArrivalAt,
      events,
    });
    const availabilityStatus = resolveEmptyLegAvailability({
      forceState,
      calendarBlocked,
    });

    const updated = await prisma.emptyLeg.update({
      where: { id },
      data: {
        forceState,
        forceAppliedByUserId: forceState ? user.id : null,
        forceAppliedAt: forceState ? new Date() : null,
        availabilityStatus,
      },
      include: emptyLegListInclude,
    });

    return jsonOk(serializeEmptyLeg(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
