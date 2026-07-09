import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { CharterLeadEmailStatus, CharterLeadRequestType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const params = new URL(request.url).searchParams;

    const assigned = params.get("assignedRepresentativeUserId");
    const listId = params.get("sourcePublicListId");
    const requestType = params.get("requestType") as CharterLeadRequestType | null;
    const emailStatus = params.get("emailStatus") as CharterLeadEmailStatus | null;
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    const rows = await prisma.charterLead.findMany({
      where: {
        ...(assigned === "unassigned"
          ? { assignedRepresentativeUserId: null }
          : assigned
            ? { assignedRepresentativeUserId: assigned }
            : {}),
        ...(listId ? { sourcePublicListId: listId } : {}),
        ...(requestType ? { requestType } : {}),
        ...(emailStatus ? { emailStatus } : {}),
        ...(dateFrom || dateTo
          ? {
              submittedAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { submittedAt: "desc" },
      take: 500,
      include: {
        emptyLeg: {
          select: { id: true, tripNumber: true, routeKey: true, tailNumber: true },
        },
        publicList: { select: { id: true, name: true } },
        assignedRepresentative: { select: { id: true, name: true } },
      },
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt.toISOString(),
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        notes: r.notes,
        requestType: r.requestType,
        requestedDep: r.requestedDep,
        requestedArr: r.requestedArr,
        requestedDate: r.requestedDate?.toISOString() ?? null,
        emailStatus: r.emailStatus,
        emailError: r.emailError,
        emptyLeg: r.emptyLeg,
        publicList: r.publicList,
        assignedRepresentative: r.assignedRepresentative,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
