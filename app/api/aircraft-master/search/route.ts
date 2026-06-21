import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    const rows = await prisma.warehouseAircraft.findMany({
      where: {
        status: "published",
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { manufacturer: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
                { modelCode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: 20,
      orderBy: { displayName: "asc" },
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        label: r.displayName,
        displayName: r.displayName,
        manufacturer: r.manufacturer,
        model: r.model,
        modelCode: r.modelCode,
        aircraftCategory: r.aircraftCategory,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
