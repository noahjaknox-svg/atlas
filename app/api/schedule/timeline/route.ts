import { NextRequest } from "next/server";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadScheduleTimeline } from "@/lib/schedule/load-timeline";

export async function GET(req: NextRequest) {
  try {
    await requireInternalUser();
    const { searchParams } = req.nextUrl;

    const rangeStart = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : undefined;
    const rangeEnd = searchParams.get("end")
      ? new Date(searchParams.get("end")!)
      : undefined;
    const tails = searchParams.get("tails")?.split(",").filter(Boolean);
    const sourceId = searchParams.get("sourceId") ?? undefined;
    const days = searchParams.get("days");

    let computedEnd = rangeEnd;
    if (!computedEnd && days) {
      const start = rangeStart ?? new Date();
      computedEnd = new Date(start.getTime() + parseInt(days, 10) * 24 * 60 * 60 * 1000);
    }

    const gridTimezone = searchParams.get("gridTimezone") ?? undefined;

    const data = await loadScheduleTimeline(prisma, {
      rangeStart,
      rangeEnd: computedEnd,
      tailNumbers: tails,
      sourceId,
      gridTimezone,
    });

    return jsonOk({
      source: data.source
        ? {
            id: data.source.id,
            name: data.source.name,
            lastSyncedAt: data.source.lastSyncedAt?.toISOString() ?? null,
            lastSyncStatus: data.source.lastSyncStatus,
          }
        : null,
      fleet: data.fleet,
      eventCount: data.eventCount,
      timeline: data.timeline,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
