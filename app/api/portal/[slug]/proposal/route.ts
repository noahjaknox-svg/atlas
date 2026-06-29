import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getPortalSession();

    if (!session || session.slug !== slug) {
      return jsonError("Unauthorized", 401);
    }

    const portal = await prisma.clientPortal.findUnique({
      where: { slug },
      include: {
        proposal: {
          include: {
            snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!portal?.active) return jsonError("Portal inactive", 404);

    const snapshot = portal.proposal.snapshots[0];
    if (!snapshot) return jsonError("Proposal not published", 404);

    const payload = snapshot.snapshotJson as unknown as ProposalSnapshotPayload;
    return jsonOk(await serializeClientSnapshot(payload));
  } catch (e) {
    return handleApiError(e);
  }
}
