import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { findNearestAirports } from "@/lib/ourairports/nearest";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const params = new URL(request.url).searchParams;
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    const limit = Math.min(Number(params.get("limit") ?? 5), 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonError("lat and lng query parameters are required", 400);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return jsonError("Invalid coordinates", 400);
    }

    const hits = await findNearestAirports(prisma, lat, lng, limit);
    return jsonOk(hits);
  } catch (e) {
    return handleApiError(e);
  }
}
