import type { PipelineStage } from "@prisma/client";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { statusOnStageChange } from "@/lib/pipeline";

const VALID_STAGES: PipelineStage[] = [
  "lead_research",
  "building",
  "internal_review",
  "client_review",
  "closed",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const body = await request.json();

    const { pipelineStage, isParked } = body;

    if (pipelineStage && !VALID_STAGES.includes(pipelineStage)) {
      return jsonError("Invalid pipeline stage", 400);
    }

    const existing = await prisma.proposal.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");

    const newStatus =
      pipelineStage && pipelineStage !== existing.pipelineStage
        ? statusOnStageChange(pipelineStage as PipelineStage, existing.status)
        : undefined;

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(pipelineStage ? { pipelineStage } : {}),
        ...(typeof isParked === "boolean" ? { isParked } : {}),
        ...(newStatus ? { status: newStatus } : {}),
      },
      include: {
        prospect: true,
        aircraftInstance: { include: { warehouseAircraft: true } },
        clientPortal: true,
        assumptions: {
          select: { assumptionName: true, value: true, confidence: true },
        },
      },
    });

    return jsonOk({
      id: proposal.id,
      pipelineStage: proposal.pipelineStage,
      isParked: proposal.isParked,
      status: proposal.status,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
