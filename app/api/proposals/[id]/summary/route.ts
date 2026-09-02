import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { decryptPinFromStorage } from "@/lib/pin-vault";
import { getPortalUrl } from "@/lib/portal-credentials";

/**
 * Lightweight proposal summary for the pipeline detail panel.
 * Selects only the fields the panel renders — no assumptions, sections,
 * scenarios, or snapshot JSON (see GET /api/proposals/[id] for the full graph).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: {
        id: true,
        proposalName: true,
        status: true,
        pipelineStage: true,
        isParked: true,
        updatedAt: true,
        createdAt: true,
        internalNotes: true,
        deletedAt: true,
        prospect: {
          select: {
            id: true,
            prospectName: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
            assignedToId: true,
          },
        },
        clientPortal: {
          select: { slug: true, active: true, viewCount: true, pinCiphertext: true },
        },
        snapshots: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { publishedAt: true, versionNumber: true },
        },
      },
    });

    if (!proposal) throw new Error("NOT_FOUND");

    const { clientPortal, ...rest } = proposal;
    return jsonOk({
      ...rest,
      clientPortal: clientPortal
        ? {
            slug: clientPortal.slug,
            active: clientPortal.active,
            viewCount: clientPortal.viewCount,
            portalUrl: getPortalUrl(clientPortal.slug),
            pin: clientPortal.pinCiphertext
              ? decryptPinFromStorage(clientPortal.pinCiphertext)
              : null,
          }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
