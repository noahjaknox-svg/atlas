import { prisma } from "@/lib/db";
export { isProposalArchived } from "@/lib/proposal-archive-state";

export async function getProposalArchiveState(proposalId: string) {
  return prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, deletedAt: true, clientPortal: { select: { id: true, active: true } } },
  });
}
