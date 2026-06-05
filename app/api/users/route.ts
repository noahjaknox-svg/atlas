import { requireAdmin, requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminList = url.searchParams.get("admin") === "1";

    if (adminList) {
      await requireAdmin();
      const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              prospectsAssigned: true,
            },
          },
        },
      });
      return jsonOk(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          createdAt: u.createdAt.toISOString(),
          proposalsAssigned: u._count.prospectsAssigned,
        }))
      );
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
