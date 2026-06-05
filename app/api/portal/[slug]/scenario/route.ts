import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getPortalSession();

    if (!session || session.slug !== slug) {
      return jsonError("Unauthorized", 401);
    }

    const body = await request.json();
    const aircraftValue = body.aircraftValue ?? body.aircraft_value;
    const ownerHours = body.ownerHours ?? body.owner_annual_hours;
    const aircraftInstanceId =
      body.aircraftInstanceId ?? body.aircraft_instance_id ?? body.aircraft ?? null;

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
    const clientView = await serializeClientSnapshot(payload, {
      aircraftValue: aircraftValue != null ? Number(aircraftValue) : undefined,
      ownerHours: ownerHours != null ? Number(ownerHours) : undefined,
      aircraftInstanceId:
        aircraftInstanceId != null && aircraftInstanceId !== ""
          ? String(aircraftInstanceId)
          : undefined,
      proposalId: portal.proposalId,
    });

    if (body.persistScenario === true) {
      await prisma.clientScenario.create({
        data: {
          proposalId: portal.proposalId,
          portalId: portal.id,
          aircraftValue: aircraftValue != null ? Number(aircraftValue) : null,
          ownerHours: ownerHours != null ? Number(ownerHours) : null,
          calculatedNetAnnualCost: clientView.proForma.netAnnualCost,
          calculatedMonthlyCost: clientView.proForma.netMonthlyCost,
          calculatedCostPerOwnerHour: clientView.proForma.costPerOwnerHour,
        },
      });
    }

    return jsonOk(clientView);
  } catch (e) {
    return handleApiError(e);
  }
}
