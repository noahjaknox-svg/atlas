import { NextRequest } from "next/server";
import { requireDepartmentAccess, requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  ensureScheduleSource,
  fetchAndSyncScheduleSource,
  shouldRunScheduledSync,
  syncScheduleSource,
  type SyncProgress,
  type SyncSourceResult,
} from "@/lib/schedule/sync-source";

/** JetInsight sync upserts ~900 events; needs headroom on Vercel serverless. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  const secrets = [process.env.SCHEDULE_SYNC_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s)
  );
  return secrets.some((secret) => header === `Bearer ${secret}`);
}

function wantsStream(req: NextRequest, body: Record<string, unknown>): boolean {
  if (body.stream === true) return true;
  if (req.nextUrl.searchParams.get("stream") === "1") return true;
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/x-ndjson");
}

function ndjsonLine(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

async function runSync(
  sourceId: string,
  icsUrl: string,
  body: Record<string, unknown>,
  onProgress?: (p: SyncProgress) => void
): Promise<SyncSourceResult> {
  if (typeof body.icsText === "string") {
    return syncScheduleSource(prisma, sourceId, body.icsText, onProgress);
  }
  return fetchAndSyncScheduleSource(prisma, sourceId, icsUrl, onProgress);
}

export async function POST(req: NextRequest) {
  try {
    const cron = isCronAuthorized(req);
    if (!cron) await requireDepartmentAccess("charter");

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
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

    // Cron respects Never / Hourly / Daily; manual sync always runs.
    if (cron) {
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
    }

    if (wantsStream(req, body)) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(ndjsonLine(payload));
          };
          try {
            const result = await runSync(source.id, icsUrl, body, (progress) => {
              send({ type: "progress", ...progress });
            });
            send({
              type: "result",
              message: "Schedule sync complete",
              ...result,
            });
            controller.close();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Sync failed";
            send({ type: "error", error: message });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const result = await runSync(source.id, icsUrl, body);
    return jsonOk({
      message: "Schedule sync complete",
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET() {
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
            pollIntervalMinutes: source.pollIntervalMinutes,
            lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
            lastSyncStatus: source.lastSyncStatus,
            lastRun: source.syncRuns[0]
              ? {
                  id: source.syncRuns[0].id,
                  startedAt: source.syncRuns[0].startedAt.toISOString(),
                  finishedAt: source.syncRuns[0].finishedAt?.toISOString() ?? null,
                  eventsUpserted: source.syncRuns[0].eventsUpserted,
                  eventsDeleted: source.syncRuns[0].eventsDeleted,
                  errorMessage: source.syncRuns[0].errorMessage,
                }
              : null,
          }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
