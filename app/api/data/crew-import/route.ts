import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { importCrewInitialData } from "@/lib/crew/import";
import { getAtlasInitialCrewData } from "@/lib/crew/initial-data";
import type { CrewInitialDataFile } from "@/lib/crew/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const useBundled = body.useBundled !== false;
    let data: CrewInitialDataFile;

    if (useBundled) {
      data = getAtlasInitialCrewData();
    } else if (body.data) {
      data = body.data as CrewInitialDataFile;
    } else {
      return handleApiError(new Error("Provide data or set useBundled: true"));
    }

    const result = await importCrewInitialData(data);
    return jsonOk({
      message: `Imported ${result.types} type(s), ${result.fleet} tail(s), ${result.performance} grid(s).`,
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
