import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPublicListByToken } from "@/lib/charter/empty-legs/public-payload";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const list = await getPublicListByToken(prisma, token);
    if (!list || list.tokenRevokedAt || !list.isActive) {
      return jsonError("This empty leg list is no longer available.", 410);
    }

    const body = (await request.json().catch(() => ({}))) as {
      emptyLegId?: string;
      placementId?: string;
    };

    await prisma.emptyLegViewEvent.create({
      data: {
        publicListId: list.id,
        emptyLegId: body.emptyLegId ?? null,
        placementId: body.placementId ?? null,
        eventType: "list_view",
      },
    });

    if (body.emptyLegId) {
      await prisma.emptyLeg.update({
        where: { id: body.emptyLegId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
