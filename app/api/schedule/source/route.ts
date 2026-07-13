import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureScheduleSource } from "@/lib/schedule/sync-source";
import { normalizePollIntervalMinutes } from "@/lib/schedule/sync-poll";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = (await request.json().catch(() => ({}))) as {
      pollIntervalMinutes?: number;
    };

    if (typeof body.pollIntervalMinutes !== "number") {
      return jsonError("pollIntervalMinutes is required", 400);
    }

    if (
      body.pollIntervalMinutes !== 0 &&
      body.pollIntervalMinutes !== 60 &&
      body.pollIntervalMinutes !== 1440
    ) {
      return jsonError("pollIntervalMinutes must be 0 (Never), 60 (Hourly), or 1440 (Daily)", 400);
    }

    const pollIntervalMinutes = normalizePollIntervalMinutes(body.pollIntervalMinutes);

    const icsUrl = process.env.JETINSIGHT_ICS_URL;
    if (!icsUrl) {
      return jsonError("JETINSIGHT_ICS_URL is not configured", 400);
    }

    const source = await ensureScheduleSource(prisma, {
      name: "PrismJet JetInsight",
      icsUrl,
    });

    const updated = await prisma.scheduleSource.update({
      where: { id: source.id },
      data: { pollIntervalMinutes },
    });

    return jsonOk({
      id: updated.id,
      name: updated.name,
      pollIntervalMinutes: updated.pollIntervalMinutes,
      message: "Auto-sync schedule updated",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
