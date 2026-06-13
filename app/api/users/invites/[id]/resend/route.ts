import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendSupabaseInviteEmail } from "@/lib/user-invites";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const invite = await prisma.userInvite.findUnique({ where: { id } });
    if (!invite || invite.status !== "pending") throw new Error("NOT_FOUND");

    const name =
      invite.email.split("@")[0]?.replace(/\./g, " ") ?? "Atlas user";

    const { method } = await sendSupabaseInviteEmail(invite.email, name);

    await prisma.userInvite.update({
      where: { id },
      data: { invitedAt: new Date() },
    });

    return jsonOk({
      message: method === "resend" ? "Invite email resent" : "Invite sent",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
