import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadPublicListPayload } from "@/lib/charter/empty-legs/public-payload";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = await loadPublicListPayload(prisma, token);
    if (payload.status === "not_found") return jsonError("Not found", 404);
    if (payload.status === "revoked") {
      return jsonOk({
        revoked: true,
        message: "This empty leg list is no longer available.",
        listName: payload.listName,
      });
    }
    return jsonOk(payload);
  } catch (e) {
    return handleApiError(e);
  }
}
