import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { syncFuelFromEia } from "@/lib/sync-fuel-from-eia";

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncFuelFromEia(prisma);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
