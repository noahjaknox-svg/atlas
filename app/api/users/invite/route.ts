import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import {
  sendSupabaseInviteEmail,
  upsertPendingInvite,
} from "@/lib/user-invites";
import type { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, email, role } = body as {
      name: string;
      email: string;
      role: UserRole;
    };

    if (!email?.trim() || !name?.trim()) throw new Error("VALIDATION");

    const { email: normalizedEmail, method } = await sendSupabaseInviteEmail(
      email,
      name
    );

    await upsertPendingInvite({
      email: normalizedEmail,
      role: role ?? "sales",
      invitedBy: admin.id,
    });

    return jsonOk({
      message:
        method === "resend"
          ? "Invite email resent"
          : "Invite sent",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
