import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

/** Ensure a Supabase-authenticated email has a matching active Atlas user row. */
export async function provisionInternalUserFromAuth(
  email: string,
  fallbackName?: string | null
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const existing = await prisma.user.findFirst({
    where: { email: normalized, active: true },
  });
  if (existing) return existing;

  const invite = await prisma.userInvite.findFirst({
    where: { email: normalized, status: "pending" },
    orderBy: { invitedAt: "desc" },
  });

  if (!invite) return null;

  const name =
    fallbackName?.trim() ||
    normalized.split("@")[0]?.replace(/\./g, " ") ||
    "Atlas user";

  const user = await prisma.user.create({
    data: {
      email: normalized,
      name,
      role: invite.role,
      departments: invite.role === "admin" ? [] : invite.departments,
      active: true,
    },
  });

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: { status: "accepted", acceptedAt: new Date() },
  });

  return user;
}
