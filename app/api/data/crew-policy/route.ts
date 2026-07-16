import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  CREW_SYNC_POLICY,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";
import { loadCrewOrgPolicy, upsertCrewOrgPolicy } from "@/lib/crew/org-policy";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const policy = await loadCrewOrgPolicy(prisma);
    return jsonOk({ policy, defaults: CREW_SYNC_POLICY });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const thresholds = (body.policy ?? body.thresholds ?? body) as CrewSyncPolicy;
    try {
      const policy = await upsertCrewOrgPolicy(prisma, thresholds);
      return jsonOk({ policy });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Invalid policy", 400);
    }
  } catch (e) {
    return handleApiError(e);
  }
}
