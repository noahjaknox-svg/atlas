import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadProFormaData } from "@/lib/proforma-load";

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
    const targetAircraftId = aircraftInstanceId ?? proposal?.aircraftInstanceId;
    if (!targetAircraftId) throw new Error("NO_AIRCRAFT");

    const payload = await loadProFormaData(id, targetAircraftId);
    return jsonOk(payload);
  } catch (e) {
    return handleApiError(e);
  }
}
