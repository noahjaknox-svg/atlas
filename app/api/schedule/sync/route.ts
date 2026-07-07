import { NextRequest } from "next/server";
import { requireDepartmentAccess, requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  ensureScheduleSource,
  fetchAndSyncScheduleSource,
  syncScheduleSource,
} from "@/lib/schedule/sync-source";

/** JetInsight sync upserts ~900 events; needs headroom on Vercel serverless. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.SCHEDULE_SYNC_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  try {
    const cron = isCronAuthorized(req);
    if (!cron) await requireDepartmentAccess("charter");

    const body = await req.json().catch(() => ({}));
    const icsUrl =
      (typeof body.icsUrl === "string" ? body.icsUrl : null) ??
      process.env.JETINSIGHT_ICS_URL;

    if (!icsUrl) {
      throw new Error("JETINSIGHT_ICS_URL is not configured");
    }

    const source = await ensureScheduleSource(prisma, {
      name: "PrismJet JetInsight",
      icsUrl,
    });

    let result;
    if (typeof body.icsText === "string") {
      result = await syncScheduleSource(prisma, source.id, body.icsText);
    } else {
      result = await fetchAndSyncScheduleSource(prisma, source.id, icsUrl);
    }

    return jsonOk({
      message: "Schedule sync complete",
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireInternalUser();
    const source = await prisma.scheduleSource.findFirst({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
      include: {
        syncRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    return jsonOk({
      configured: !!process.env.JETINSIGHT_ICS_URL || !!source,
      source: source
        ? {
            id: source.id,
            name: source.name,
            icsUrl: source.icsUrl,
            lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
            lastSyncStatus: source.lastSyncStatus,
            lastRun: source.syncRuns[0] ?? null,
          }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
