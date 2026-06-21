import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { searchAirportReference } from "@/lib/ourairports/lookup";
import { formatAirportSearchResult } from "@/lib/ourairports/search-rank";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return jsonOk([]);

    const referenceHits = await searchAirportReference(prisma, q, 15);

    return jsonOk(referenceHits.map(formatAirportSearchResult));
  } catch (e) {
    return handleApiError(e);
  }
}
