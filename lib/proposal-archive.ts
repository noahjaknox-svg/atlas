import { prisma } from "@/lib/db";

export async function getProposalArchiveState(proposalId: string) {
  return prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, deletedAt: true, clientPortal: { select: { id: true, active: true } } },
  });
}

export function isProposalArchived(
  proposal: { deletedAt: Date | null } | null | undefined
): proposal is { deletedAt: Date } {
  return proposal != null && proposal.deletedAt != null;
}
