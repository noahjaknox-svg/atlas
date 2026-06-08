import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, aircraftId } = await params;
    const body = await request.json();

    const aircraft = await prisma.aircraftInstance.findFirst({
      where: { id: aircraftId, prospectId: { not: undefined } },
    });
    if (!aircraft) throw new Error("NOT_FOUND");

    if (body.select === true) {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { aircraftInstanceId: aircraftId },
      });
      return jsonOk({ selectedAircraftId: aircraftId });
    }

    const instanceData: Record<string, unknown> = {};
    if (body.year !== undefined) {
      instanceData.year = body.year ? parseInt(String(body.year), 10) : null;
    }
    if (body.proposedHomeBaseIcao !== undefined) {
      instanceData.proposedHomeBaseIcao = body.proposedHomeBaseIcao;
    }
    if (body.tailNumber !== undefined) instanceData.tailNumber = body.tailNumber;
    if (body.serialNumber !== undefined) instanceData.serialNumber = body.serialNumber;
    if (body.estimatedValue !== undefined) {
      instanceData.estimatedValue = body.estimatedValue
        ? parseFloat(String(body.estimatedValue))
        : null;
    }
    if (body.valueSource !== undefined) instanceData.valueSource = body.valueSource;
    if (body.aircraftMasterId !== undefined) {
      instanceData.aircraftMasterId = body.aircraftMasterId || null;
    }
    if (body.fboName !== undefined) instanceData.fboName = body.fboName;
    if (typeof body.includedOnProposal === "boolean") {
      instanceData.includedOnProposal = body.includedOnProposal;
    }
    if (body.clientSummary !== undefined) {
      instanceData.clientSummary = body.clientSummary || null;
    }
    if (body.portalImageUrl !== undefined) {
      instanceData.portalImageUrl = body.portalImageUrl || null;
    }
    if (body.portalVideoUrl !== undefined) {
      instanceData.portalVideoUrl = body.portalVideoUrl || null;
    }
    if (body.portalSpecHighlights !== undefined) {
      instanceData.portalSpecHighlights = Array.isArray(body.portalSpecHighlights)
        ? body.portalSpecHighlights
        : null;
    }

    const updated = await prisma.aircraftInstance.update({
      where: { id: aircraftId },
      data: instanceData,
      include: { aircraftMaster: true },
    });

    return jsonOk(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, aircraftId } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { aircraftInstanceId: true, prospectId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const onProposal = await prisma.aircraftInstance.findFirst({
      where: { id: aircraftId, OR: [{ proposalId }, { prospectId: proposal.prospectId }] },
    });
    if (!onProposal) return jsonError("Aircraft not found", 404);

    const category = aircraftAssumptionCategory(aircraftId);
    await prisma.proposalAssumption.deleteMany({
      where: { proposalId, category },
    });
    await prisma.proposalScenario.deleteMany({
      where: { proposalId, aircraftInstanceId: aircraftId },
    });
    await prisma.aircraftInstance.delete({ where: { id: aircraftId } });

    let selectedAircraftId = proposal.aircraftInstanceId;
    if (selectedAircraftId === aircraftId) {
      const remaining = await prisma.aircraftInstance.findFirst({
        where: { proposalId },
        orderBy: { createdAt: "asc" },
      });
      selectedAircraftId = remaining?.id ?? null;
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { aircraftInstanceId: selectedAircraftId },
      });
    }

    return jsonOk({ selectedAircraftId });
  } catch (e) {
    return handleApiError(e);
  }
}
