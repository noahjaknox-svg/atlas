import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serializeAircraftType } from "@/lib/warehouse-aircraft-fields";

export async function GET() {
  try {
    await requireInternalUser();
    const aircraft = await prisma.aircraftType.findMany({
      orderBy: { displayName: "asc" },
    });
    return jsonOk(aircraft.map(serializeAircraftType));
  } catch (e) {
    return handleApiError(e);
  }
}
