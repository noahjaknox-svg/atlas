import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { importCrewInitialData } from "@/lib/crew/import";
import { getAtlasInitialCrewData } from "@/lib/crew/initial-data";
import { normalizeCrewInitialData } from "@/lib/crew/normalize-initial-data";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const useBundled = body.useBundled === true;
    const raw = useBundled ? getAtlasInitialCrewData() : body.data ?? body;
    if (!raw || typeof raw !== "object") {
      return handleApiError(new Error("Provide data JSON or set useBundled: true"));
    }

    const data = normalizeCrewInitialData(raw);
    const result = await importCrewInitialData(data);
    return jsonOk({
      message: `Imported ${result.types} type(s), ${result.fleet} tail(s), ${result.performance} grid(s).`,
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
