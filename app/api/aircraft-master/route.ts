import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serializeWarehouseAircraft } from "@/lib/warehouse-aircraft-fields";

export async function GET() {
  try {
    await requireInternalUser();
    const aircraft = await prisma.warehouseAircraft.findMany({
      orderBy: { displayName: "asc" },
    });
    return jsonOk(aircraft.map(serializeWarehouseAircraft));
  } catch (e) {
    return handleApiError(e);
  }
}
