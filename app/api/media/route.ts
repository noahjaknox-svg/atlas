import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { getMediaLibraryItems } from "@/lib/media-library";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const { searchParams } = new URL(request.url);
    const imagesOnly =
      searchParams.get("imagesOnly") !== "0" && searchParams.get("imagesOnly") !== "false";
    const items = await getMediaLibraryItems({ imagesOnly });
    return jsonOk({ items });
  } catch (e) {
    return handleApiError(e);
  }
}
