import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getExternalAppUrl } from "@/lib/app-url";
import { publishProposal, republishProposal } from "@/lib/publish";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireInternalUser();
    if (user.role !== "admin") {
      return jsonError("Only admins can publish proposals", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const isRepublish = Boolean((body as { republish?: boolean }).republish);

    if (isRepublish) {
      const result = await republishProposal(id, user.id);
      const baseUrl = getExternalAppUrl();
      return jsonOk({
        ...result,
        portalUrl: `${baseUrl}/${result.slug}`,
        message: "Proposal republished with latest data.",
      });
    }

    const result = await publishProposal(id, user.id);

    const baseUrl = getExternalAppUrl();

    return jsonOk({
      ...result,
      portalUrl: `${baseUrl}/${result.slug}`,
      message: "Proposal published. Save the PIN — it cannot be recovered.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
