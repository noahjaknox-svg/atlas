import { prisma } from "@/lib/db";
import { syncPendingInvites } from "@/lib/user-invites";
import type { AppDepartment } from "@prisma/client";

export type UsersAdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  departments: AppDepartment[];
  active: boolean;
};

export type UsersAdminInviteRow = {
  id: string;
  email: string;
  role: string;
  departments: AppDepartment[];
  invitedAt: string;
  invitedBy: string;
};

export async function loadUsersAdminData(adminUserId: string): Promise<{
  users: UsersAdminUserRow[];
  pendingInvites: UsersAdminInviteRow[];
}> {
  await syncPendingInvites(adminUserId);

  const [users, pendingInvites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.userInvite.findMany({
      where: { status: "pending" },
      orderBy: { invitedAt: "desc" },
      include: {
        inviter: { select: { name: true } },
      },
    }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departments: u.departments,
      active: u.active,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      departments: i.departments,
      invitedAt: i.invitedAt.toISOString(),
      invitedBy: i.inviter.name,
    })),
  };
}
