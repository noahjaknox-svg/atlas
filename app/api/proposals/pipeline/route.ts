import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getCardSubtitle, getPipelineBadges } from "@/lib/pipeline";
import { getMissingRequiredFields } from "@/lib/required-fields";

export async function GET() {
  try {
    await requireInternalUser();

    const proposals = await prisma.proposal.findMany({
      where: { deletedAt: null },
      include: {
        prospect: true,
        aircraftInstance: { include: { aircraftMaster: true } },
        clientPortal: true,
        assumptions: {
          select: {
            assumptionName: true,
            value: true,
            confidence: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    const cards = proposals.map((p) => ({
      id: p.id,
      proposalName: p.proposalName,
      status: p.status,
      pipelineStage: p.pipelineStage,
      isParked: p.isParked,
      updatedAt: p.updatedAt.toISOString(),
      prospectName: p.prospect.prospectName,
      assignedToId: p.prospect.assignedToId,
      assigneeName:
        users.find((u) => u.id === p.prospect.assignedToId)?.name ?? null,
      aircraftCategory: p.aircraftInstance?.aircraftMaster?.aircraftCategory ?? null,
      subtitle: getCardSubtitle({
        prospectName: p.prospect.prospectName,
        companyName: p.prospect.companyName,
        aircraftInstance: p.aircraftInstance,
      }),
      badges: getPipelineBadges({
        status: p.status,
        pipelineStage: p.pipelineStage,
        isParked: p.isParked,
        assumptions: p.assumptions,
        clientPortal: p.clientPortal,
      }),
      missingFieldLabels: getMissingRequiredFields(p.assumptions),
    }));

    return jsonOk(cards);
  } catch (e) {
    return handleApiError(e);
  }
}
