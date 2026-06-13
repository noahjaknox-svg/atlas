import { requireAdmin, requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadUsersAdminData } from "@/lib/users-admin-load";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminList = url.searchParams.get("admin") === "1";

    if (adminList) {
      const admin = await requireAdmin();
      const data = await loadUsersAdminData(admin.id);
      return jsonOk(data);
    }

    await requireInternalUser();
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return jsonOk(users);
  } catch (e) {
    return handleApiError(e);
  }
}
