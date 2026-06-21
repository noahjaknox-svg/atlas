import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getProposalArchiveState, isProposalArchived } from "@/lib/proposal-archive";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;

    const existing = await getProposalArchiveState(id);
    if (!existing) throw new Error("NOT_FOUND");
    if (isProposalArchived(existing)) {
      return jsonError("Proposal is already archived", 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true, deletedAt: true },
      });

      let portalActive: boolean | null = null;
      if (existing.clientPortal) {
        const portal = await tx.clientPortal.update({
          where: { id: existing.clientPortal.id },
          data: { active: false },
          select: { active: true },
        });
        portalActive = portal.active;
      }

      return { ...proposal, portalActive };
    });

    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
