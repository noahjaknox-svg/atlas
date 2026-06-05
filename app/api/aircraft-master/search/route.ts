import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return jsonOk([]);

    const rows = await prisma.aircraftMaster.findMany({
      where: {
        OR: [
          { model: { contains: q, mode: "insensitive" } },
          { manufacturer: { contains: q, mode: "insensitive" } },
          { variant: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        label: `${r.manufacturer} ${r.model}${r.variant ? ` ${r.variant}` : ""}`.trim(),
        manufacturer: r.manufacturer,
        model: r.model,
        aircraftCategory: r.aircraftCategory,
        typicalFuelBurnGph: r.typicalFuelBurnGph?.toString() ?? null,
        typicalCharterRate: r.typicalCharterRate?.toString() ?? null,
        defaultEngineModel: r.defaultEngineModel,
        defaultApuModel: r.defaultApuModel,
        maxRecommendedUtilization: r.maxRecommendedUtilization,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
