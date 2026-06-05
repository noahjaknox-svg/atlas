import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Stub iFlightPlanner sync — updates only non-overridden API-sourced rows when key is set. */
export async function POST() {
  try {
    await requireAdmin();

    if (!process.env.IFLIGHTPLANNER_API_KEY) {
      return jsonOk({
        message:
          "iFlightPlanner sync skipped — set IFLIGHTPLANNER_API_KEY for live sync. Manual FBO entries unchanged.",
        updated: 0,
      });
    }

    const fbos = await prisma.fboLocation.findMany({
      where: { source: "iflightplanner", manualOverride: false },
    });

    return jsonOk({
      message: `Stub sync complete (${fbos.length} FBO records eligible; live API integration pending).`,
      updated: 0,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
