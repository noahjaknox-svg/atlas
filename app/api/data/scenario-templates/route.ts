import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "scenario-templates",
      (where) =>
        prisma.scenarioTemplate.findMany({
          where,
          include: {
            aircraftMaster: { select: { manufacturer: true, model: true } },
            assumptions: true,
          },
          orderBy: { name: "asc" },
        }),
      () => prisma.scenarioTemplate.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          description: r.description,
          assumptions: r.assumptions.map((a) => ({
            id: a.id,
            assumptionKey: a.assumptionKey,
            value: a.value,
          })),
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = parseOptionalString(body.name);
    const aircraftMasterId = parseOptionalString(body.aircraftMasterId);
    if (!name || !aircraftMasterId) return jsonError("name and aircraftMasterId required");

    const row = await prisma.scenarioTemplate.create({
      data: {
        name,
        aircraftMasterId,
        description: parseOptionalString(body.description),
        assumptions: Array.isArray(body.assumptions)
          ? {
              create: body.assumptions.map((a: { assumptionKey: string; value: string }) => ({
                assumptionKey: a.assumptionKey,
                value: String(a.value),
              })),
            }
          : undefined,
      },
      include: { assumptions: true },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
