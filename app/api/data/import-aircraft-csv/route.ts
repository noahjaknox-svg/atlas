import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  importAircraftCsvFromContent,
  importAircraftCsvFromFile,
} from "@/lib/run-aircraft-csv-import";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const csvContent =
      typeof body === "object" && body !== null && "csvContent" in body
        ? String((body as { csvContent?: string }).csvContent ?? "")
        : "";
    const result = csvContent.trim()
      ? await importAircraftCsvFromContent(prisma, csvContent)
      : await importAircraftCsvFromFile(prisma);
    return jsonOk({
      message: result.message,
      aircraftTypes: result.aircraftTypes,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
