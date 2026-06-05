import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const latest = await prisma.fuelIndexSnapshot.findFirst({
      orderBy: { effectiveDate: "desc" },
    });
    if (!latest) {
      return jsonOk(null);
    }
    return jsonOk({
      pricePerGallon: Number(latest.pricePerGallon),
      effectiveDate: latest.effectiveDate.toISOString().slice(0, 10),
      indexName: latest.indexName,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
