import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { loadPipelinePage } from "@/lib/pipeline-load";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const archived = url.searchParams.get("archived") === "1";
    const result = await loadPipelinePage(page, { archived });
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
