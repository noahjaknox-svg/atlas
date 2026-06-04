import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { publishProposal } from "@/lib/publish";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireInternalUser();
    if (user.role !== "admin") {
      return jsonError("Only admins can publish proposals", 403);
    }

    const { id } = await params;
    const result = await publishProposal(id, user.id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return jsonOk({
      ...result,
      portalUrl: `${baseUrl}/${result.slug}`,
      message: "Proposal published. Save the PIN — it cannot be recovered.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
