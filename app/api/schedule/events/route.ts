import { NextRequest } from "next/server";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireInternalUser();
    const { searchParams } = req.nextUrl;

    const rangeStart = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : new Date();
    const rangeEnd = searchParams.get("end")
      ? new Date(searchParams.get("end")!)
      : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const tail = searchParams.get("tail");
    const availabilityClass = searchParams.get("class");
    const sourceId = searchParams.get("sourceId") ?? undefined;

    const events = await prisma.scheduleEvent.findMany({
      where: {
        deletedAt: null,
        ...(sourceId ? { sourceId } : {}),
        ...(tail ? { tailNumber: tail.toUpperCase() } : {}),
        ...(availabilityClass
          ? { availabilityClass: availabilityClass as never }
          : {}),
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      orderBy: { startsAt: "asc" },
    });

    return jsonOk({
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      events: events.map(serializeEvent),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

function serializeEvent(e: {
  id: string;
  tailNumber: string;
  depIcao: string | null;
  arrIcao: string | null;
  locationIcao: string | null;
  startsAt: Date;
  endsAt: Date;
  clientLabel: string | null;
  paxCount: number | null;
  rawEventType: string;
  availabilityClass: string;
  isHold: boolean;
  isAdminBlock: boolean;
  externalUrl: string | null;
  summaryRaw: string;
}) {
  return {
    id: e.id,
    tailNumber: e.tailNumber,
    depIcao: e.depIcao,
    arrIcao: e.arrIcao,
    locationIcao: e.locationIcao,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    clientLabel: e.clientLabel,
    paxCount: e.paxCount,
    rawEventType: e.rawEventType,
    availabilityClass: e.availabilityClass,
    isHold: e.isHold,
    isAdminBlock: e.isAdminBlock,
    externalUrl: e.externalUrl,
    summaryRaw: e.summaryRaw,
  };
}
