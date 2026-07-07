import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { regeneratePortalPin } from "@/lib/portal-credentials";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const result = await regeneratePortalPin(id);
    return jsonOk(result);
  } catch (e) {
    const message =
      e instanceof Error && e.message.includes("Unknown argument `pinCiphertext`")
        ? "Server needs a restart after the latest database update. Stop `npm run dev`, run `npx prisma generate`, then start dev again."
        : undefined;
    if (message) return jsonError(message, 500);
    return handleApiError(e);
  }
}
