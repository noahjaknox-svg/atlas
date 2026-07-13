import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  ensureScheduleSource,
  fetchAndSyncScheduleSource,
  shouldRunScheduledSync,
} from "@/lib/schedule/sync-source";

/** Hourly JetInsight sync check — may run a full ICS upsert. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  const secrets = [process.env.SCHEDULE_SYNC_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s)
  );
  return secrets.some((secret) => header === `Bearer ${secret}`);
}

async function runCronSync() {
  const icsUrl = process.env.JETINSIGHT_ICS_URL;
  if (!icsUrl) {
    return jsonOk({
      skipped: true,
      reason: "not_configured",
      message: "JETINSIGHT_ICS_URL is not configured",
    });
  }

  const source = await ensureScheduleSource(prisma, {
    name: "PrismJet JetInsight",
    icsUrl,
  });

  const due = shouldRunScheduledSync(source);
  if (!due.run) {
    return jsonOk({
      skipped: true,
      reason: due.reason,
      pollIntervalMinutes: source.pollIntervalMinutes,
      lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
      message: `Schedule sync skipped (${due.reason})`,
    });
  }

  const result = await fetchAndSyncScheduleSource(prisma, source.id, icsUrl);
  return jsonOk({
    skipped: false,
    message: "Schedule sync complete",
    ...result,
  });
}

/** Vercel Cron invokes GET. Also accepts POST for manual cron testing. */
export async function GET(req: NextRequest) {
  try {
    if (!isCronAuthorized(req)) {
      return jsonError("Unauthorized", 401);
    }
    return await runCronSync();
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isCronAuthorized(req)) {
      return jsonError("Unauthorized", 401);
    }
    return await runCronSync();
  } catch (e) {
    return handleApiError(e);
  }
}
