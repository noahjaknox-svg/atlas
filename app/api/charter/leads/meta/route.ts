import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ALL_DEPARTMENT_IDS } from "@/lib/departments";

export async function GET() {
  try {
    await requireDepartmentAccess("charter");

    const [users, lists] = await Promise.all([
      prisma.user.findMany({
        where: {
          active: true,
          OR: [
            { role: "admin" },
            { departments: { has: "charter" } },
          ],
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.emptyLegPublicList.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return jsonOk({ users, lists, departments: ALL_DEPARTMENT_IDS });
  } catch (e) {
    return handleApiError(e);
  }
}
