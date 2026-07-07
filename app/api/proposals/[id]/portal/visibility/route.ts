import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { setPortalActive } from "@/lib/portal-credentials";

/**
 * Take a published proposal down (active=false) or restore it (active=true)
 * without archiving the deal. The snapshot, slug, and PIN are preserved.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const active = Boolean((body as { active?: boolean }).active);

    const result = await setPortalActive(id, active);

    return jsonOk({
      ...result,
      message: active
        ? "Proposal restored — clients can view it again."
        : "Proposal taken down — clients can no longer view it.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
