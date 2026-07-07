import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runTripMatch } from "@/lib/charter/run-trip-match";
import type { TripMatchInput } from "@/lib/charter/types";
import type { CharterTripType } from "@prisma/client";

const VALID_TRIP_TYPES = new Set<CharterTripType>([
  "one_way",
  "round_trip",
  "multi_city",
]);

export async function POST(request: Request) {
  try {
    const user = await requireDepartmentAccess("charter");
    const body = (await request.json()) as TripMatchInput;

    if (!body.tripType || !VALID_TRIP_TYPES.has(body.tripType)) {
      return jsonError("Invalid trip type", 400);
    }
    if (!body.legs?.length) {
      return jsonError("At least one leg is required", 400);
    }
    if (!body.paxCount || body.paxCount < 1) {
      return jsonError("Passenger count is required", 400);
    }

    for (const leg of body.legs) {
      if (!leg.depIcao?.trim() || !leg.arrIcao?.trim()) {
        return jsonError("Each leg requires departure and arrival airports", 400);
      }
      if (!leg.timeTbd && !leg.departAt) {
        return jsonError("Each leg requires a departure date/time or Time TBD", 400);
      }
    }

    const result = await runTripMatch(
      prisma,
      {
        tripType: body.tripType,
        flightCategory: body.flightCategory ?? "Charter flight",
        paxCount: body.paxCount,
        legs: body.legs,
        clientName: body.clientName,
        notes: body.notes,
      },
      user.id
    );

    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
