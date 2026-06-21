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
    if (!isProposalArchived(existing)) {
      return jsonError("Proposal is not archived", 409);
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, deletedAt: true },
    });

    return jsonOk(proposal);
  } catch (e) {
    return handleApiError(e);
  }
}
