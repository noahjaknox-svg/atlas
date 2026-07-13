import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  emptyLegListInclude,
  serializeEmptyLegWithPricing,
} from "@/lib/charter/empty-legs/serialize";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;

    const row = await prisma.emptyLeg.findUnique({
      where: { id },
      include: emptyLegListInclude,
    });
    if (!row) return jsonError("Not found", 404);

    const relatedHistory = await prisma.emptyLeg.findMany({
      where: {
        tripNumber: row.tripNumber,
        lifecycleStatus: "history",
        id: { not: id },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: emptyLegListInclude,
    });

    const [detail, history] = await Promise.all([
      serializeEmptyLegWithPricing(prisma, row),
      Promise.all(relatedHistory.map((h) => serializeEmptyLegWithPricing(prisma, h))),
    ]);

    return jsonOk({
      ...detail,
      relatedHistory: history,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.emptyLeg.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const data: Record<string, unknown> = {};
    if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
    if (typeof body.internalNotes === "string" || body.internalNotes === null) {
      data.internalNotes = body.internalNotes;
    }
    if (body.slidingWindowStartAt === null || typeof body.slidingWindowStartAt === "string") {
      data.slidingWindowStartAt = body.slidingWindowStartAt
        ? new Date(body.slidingWindowStartAt)
        : null;
    }
    if (body.slidingWindowEndAt === null || typeof body.slidingWindowEndAt === "string") {
      data.slidingWindowEndAt = body.slidingWindowEndAt
        ? new Date(body.slidingWindowEndAt)
        : null;
    }

    const updated = await prisma.emptyLeg.update({
      where: { id },
      data,
      include: emptyLegListInclude,
    });

    return jsonOk(await serializeEmptyLegWithPricing(prisma, updated));
  } catch (e) {
    return handleApiError(e);
  }
}
