import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import { buildSnapshotPayload } from "@/lib/snapshot";

/** Staff draft preview — live workspace pro forma for portal v2 deck navigation. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const url = new URL(request.url);
    const aircraftInstanceId = url.searchParams.get("aircraftInstanceId");

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { aircraftInstanceId: true },
    });
    if (!proposal) return handleApiError(new Error("NOT_FOUND"));

    const targetAircraftId = aircraftInstanceId ?? proposal.aircraftInstanceId;
    const fullyResolveAircraftIds = targetAircraftId ? [targetAircraftId] : [];

    const payload = await buildSnapshotPayload(id, { fullyResolveAircraftIds });
    const view = await serializeClientSnapshot(payload, {
      proposalId: id,
      aircraftInstanceId: targetAircraftId,
      useLiveWorkspace: true,
    });

    return jsonOk(view);
  } catch (e) {
    return handleApiError(e);
  }
}
