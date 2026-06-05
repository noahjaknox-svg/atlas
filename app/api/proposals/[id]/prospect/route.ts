import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const body = await request.json();

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { prospectId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const prospectData: Record<string, unknown> = {};
    if (body.prospectName !== undefined) prospectData.prospectName = body.prospectName;
    if (body.contactName !== undefined) prospectData.contactName = body.contactName;
    if (body.contactEmail !== undefined) prospectData.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) prospectData.contactPhone = body.contactPhone;
    if (body.internalNotes !== undefined) prospectData.internalNotes = body.internalNotes;
    if (body.clientSummary !== undefined) prospectData.clientSummary = body.clientSummary;
    if (body.currentManager !== undefined) prospectData.currentManager = body.currentManager;
    if (body.assignedToId !== undefined) {
      prospectData.assignedToId = body.assignedToId || null;
    }

    const prospect = await prisma.prospect.update({
      where: { id: proposal.prospectId },
      data: prospectData,
    });

    const proposalData: Record<string, unknown> = {};
    if (body.proposalName !== undefined) proposalData.proposalName = body.proposalName;
    if (Object.keys(proposalData).length > 0) {
      await prisma.proposal.update({ where: { id }, data: proposalData });
    }

    const assignedTo =
      prospect.assignedToId != null
        ? await prisma.user.findUnique({
            where: { id: prospect.assignedToId },
            select: { id: true, name: true, email: true },
          })
        : null;

    return jsonOk({ ...prospect, assignedTo });
  } catch (e) {
    return handleApiError(e);
  }
}
