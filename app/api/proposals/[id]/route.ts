import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

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
        aircraftInstance: { include: { aircraftMaster: true } },
        assumptions: true,
        sections: { orderBy: { sortOrder: "asc" } },
        scenarios: true,
        clientPortal: true,
        snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!proposal) throw new Error("NOT_FOUND");
    return jsonOk(proposal);
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

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        proposalName: body.proposalName,
        status: body.status,
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
