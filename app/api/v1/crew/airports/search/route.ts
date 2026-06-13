import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import { searchAirportReference } from "@/lib/ourairports/lookup";

export async function GET(request: Request) {
  try {
    requireCrewApiKey(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number.parseInt(limitRaw, 10))) : 20;

    if (q.length < 1) return jsonOk([]);

    const hits = await searchAirportReference(prisma, q, limit);
    return jsonOk(hits);
  } catch (e) {
    return handleCrewApiError(e);
  }
}
