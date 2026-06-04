import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireInternalUser();
    const aircraft = await prisma.aircraftMaster.findMany({
      orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
    });
    return jsonOk(aircraft);
  } catch (e) {
    return handleApiError(e);
  }
}
