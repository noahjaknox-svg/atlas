import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getProposalArchiveState, isProposalArchived } from "@/lib/proposal-archive";
import { decryptPinFromStorage } from "@/lib/pin-vault";
import { getPortalUrl } from "@/lib/portal-credentials";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        prospect: true,
        preparedBy: { select: { id: true, name: true, email: true } },
        aircraftInstance: { include: { aircraftType: true } },
        assumptions: true,
        sections: { orderBy: { sortOrder: "asc" } },
        scenarios: true,
        clientPortal: true,
        snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!proposal) throw new Error("NOT_FOUND");

    const serialized = JSON.parse(JSON.stringify(proposal)) as Record<string, unknown>;
    if (proposal.clientPortal) {
      const { pinCiphertext, ...portalRest } = proposal.clientPortal;
      const pin = pinCiphertext ? decryptPinFromStorage(pinCiphertext) : null;
      serialized.clientPortal = {
        ...portalRest,
        portalUrl: getPortalUrl(proposal.clientPortal.slug),
        pin,
      };
    }

    return jsonOk(serialized);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const body = await request.json();

    const existing = await getProposalArchiveState(id);
    if (!existing) throw new Error("NOT_FOUND");
    if (isProposalArchived(existing)) {
      return jsonError("Proposal is archived", 409);
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        proposalName: body.proposalName,
        status: body.status,
        isParked: typeof body.isParked === "boolean" ? body.isParked : undefined,
        pipelineStage: body.pipelineStage,
        internalNotes: body.internalNotes,
        clientSummary: body.clientSummary,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
      },
    });

    return jsonOk(proposal);
  } catch (e) {
    return handleApiError(e);
  }
}
