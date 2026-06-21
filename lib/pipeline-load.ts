import { prisma } from "@/lib/db";
import { getCardSubtitle, getPipelineBadges } from "@/lib/pipeline";
import { getMissingRequiredFields } from "@/lib/required-fields";
import type { PipelineCardData } from "@/components/internal/pipeline-card";

export const PIPELINE_PAGE_SIZE = 50;

export async function loadPipelinePage(
  page = 1,
  opts?: { archived?: boolean }
) {
  const skip = (Math.max(1, page) - 1) * PIPELINE_PAGE_SIZE;
  const archived = opts?.archived === true;
  const where = archived ? { deletedAt: { not: null } } : { deletedAt: null };

  const [proposals, totalCount, rawAtlasUsers] = await Promise.all([
    prisma.proposal.findMany({
      where,
      include: {
        prospect: true,
        aircraftInstance: { include: { aircraftMaster: true } },
        clientPortal: true,
        assumptions: {
          select: { assumptionName: true, value: true, confidence: true },
        },
      },
      orderBy: archived ? { deletedAt: "desc" } : { updatedAt: "desc" },
      skip,
      take: PIPELINE_PAGE_SIZE,
    }),
    prisma.proposal.count({ where }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const atlasUsers = Array.from(
    new Map(rawAtlasUsers.map((u) => [u.id, u])).values()
  );

  const cards: PipelineCardData[] = proposals.map((p) => ({
    id: p.id,
    prospectName: p.prospect.prospectName,
    subtitle: getCardSubtitle({
      prospectName: p.prospect.prospectName,
      companyName: p.prospect.companyName,
      aircraftInstance: p.aircraftInstance,
    }),
    pipelineStage: p.pipelineStage,
    status: p.status,
    isParked: p.isParked,
    updatedAt: p.updatedAt.toISOString(),
    assignedToId: p.prospect.assignedToId,
    assigneeName:
      atlasUsers.find((u) => u.id === p.prospect.assignedToId)?.name ?? null,
    aircraftCategory: p.aircraftInstance?.aircraftMaster?.aircraftCategory ?? null,
    badges: getPipelineBadges({
      status: p.status,
      pipelineStage: p.pipelineStage,
      isParked: p.isParked,
      archived: archived || p.deletedAt != null,
      assumptions: p.assumptions,
      clientPortal: p.clientPortal,
    }),
    missingFieldLabels: getMissingRequiredFields(p.assumptions),
    deletedAt: p.deletedAt?.toISOString() ?? null,
  }));

  return {
    cards,
    atlasUsers,
    totalCount,
    page,
    pageSize: PIPELINE_PAGE_SIZE,
    hasMore: skip + proposals.length < totalCount,
    archived,
  };
}
