import "../lib/load-env";
import { PrismaClient, ProposalStatus, PipelineStage } from "@prisma/client";

const prisma = new PrismaClient();

function stageFromStatus(
  status: ProposalStatus,
  assumptionCount: number
): PipelineStage {
  switch (status) {
    case "internal_review":
    case "approved":
      return "internal_review";
    case "published":
    case "viewed":
    case "revised":
      return "client_review";
    case "won":
    case "lost":
      return "closed";
    case "draft":
    default:
      return assumptionCount > 0 ? "building" : "lead_research";
  }
}

async function main() {
  const proposals = await prisma.proposal.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { assumptions: true } } },
  });

  for (const p of proposals) {
    const pipelineStage = stageFromStatus(p.status, p._count.assumptions);
    await prisma.proposal.update({
      where: { id: p.id },
      data: { pipelineStage },
    });
  }

  console.log(`Backfilled pipelineStage for ${proposals.length} proposals.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
