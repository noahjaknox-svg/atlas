import { prisma } from "@/lib/db";
import { syncPendingInvites } from "@/lib/user-invites";

export type UsersAdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  proposalsAssigned: number;
};

export type UsersAdminInviteRow = {
  id: string;
  email: string;
  role: string;
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
      include: {
        _count: {
          select: { prospectsAssigned: true },
        },
      },
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
      active: u.active,
      proposalsAssigned: u._count.prospectsAssigned,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      invitedAt: i.invitedAt.toISOString(),
      invitedBy: i.inviter.name,
    })),
  };
}
