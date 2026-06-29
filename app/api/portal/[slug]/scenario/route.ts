import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

/**
 * Recalculate pro forma from the published snapshot plus in-memory client overrides.
 * Does not read workspace assumptions from the database — baseline is frozen at publish.
 * Optional ClientScenario create is analytics-only; no portal read path uses stored scenarios.
 */
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
    const proformaOwnerHours =
      body.proformaOwnerHours ?? body.ownerProformaHours ?? body.proforma_owner_hours;
    const crewStepIndex =
      body.crewStepIndex ?? body.crew_step_index ?? body.crewStep ?? undefined;
    const financingEnabled =
      body.financingEnabled ?? body.financing_enabled ?? undefined;
    const downPaymentPercent =
      body.downPaymentPercent ?? body.down_payment_percent ?? undefined;
    const interestRate = body.interestRate ?? body.interest_rate ?? undefined;
    const termMonths = body.termMonths ?? body.term_months ?? undefined;
    const balloonPayment = body.balloonPayment ?? body.balloon_payment ?? undefined;
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
      proformaOwnerHours: Array.isArray(proformaOwnerHours)
        ? proformaOwnerHours.map((h: unknown) => Number(h))
        : undefined,
      crewStepIndex:
        crewStepIndex != null && crewStepIndex !== ""
          ? Number(crewStepIndex)
          : undefined,
      financingEnabled:
        financingEnabled != null && financingEnabled !== ""
          ? financingEnabled === true || financingEnabled === "yes"
          : undefined,
      downPaymentPercent:
        downPaymentPercent != null && downPaymentPercent !== ""
          ? Number(downPaymentPercent)
          : undefined,
      interestRate:
        interestRate != null && interestRate !== ""
          ? Number(interestRate)
          : undefined,
      termMonths:
        termMonths != null && termMonths !== "" ? Number(termMonths) : undefined,
      balloonPayment:
        balloonPayment != null && balloonPayment !== ""
          ? Number(balloonPayment)
          : undefined,
      aircraftInstanceId:
        aircraftInstanceId != null && aircraftInstanceId !== ""
          ? String(aircraftInstanceId)
          : undefined,
    });

    if (body.persistScenario === true) {
      const persistedOwnerHours =
        ownerHours != null
          ? Number(ownerHours)
          : Array.isArray(proformaOwnerHours)
            ? proformaOwnerHours.reduce(
                (s: number, h: unknown) => s + (Number(h) || 0),
                0
              )
            : null;
      await prisma.clientScenario.create({
        data: {
          proposalId: portal.proposalId,
          portalId: portal.id,
          aircraftValue: aircraftValue != null ? Number(aircraftValue) : null,
          ownerHours: persistedOwnerHours,
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
