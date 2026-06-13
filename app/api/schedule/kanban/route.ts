import { NextRequest } from "next/server";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadScheduleKanban } from "@/lib/schedule/load-kanban";
import { KANBAN_COLUMNS } from "@/lib/schedule/kanban";

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

    const data = await loadScheduleKanban(prisma, {
      rangeStart,
      rangeEnd,
      tailNumbers: tails,
      sourceId,
    });

    return jsonOk({
      columns: KANBAN_COLUMNS,
      rangeStart: data.rangeStart,
      rangeEnd: data.rangeEnd,
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
      board: data.board,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
