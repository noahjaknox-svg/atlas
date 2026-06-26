import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { ensureDraftPortalForProposal } from "@/lib/draft-portal";
import { getPortalUrl } from "@/lib/portal-credentials";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const { slug } = await ensureDraftPortalForProposal(id);
    return jsonOk({
      slug,
      portalUrl: getPortalUrl(slug),
      active: false,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
