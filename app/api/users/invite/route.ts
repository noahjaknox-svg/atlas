import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { parseDepartmentIds } from "@/lib/departments";
import {
  sendSupabaseInviteEmail,
  upsertPendingInvite,
} from "@/lib/user-invites";
import type { AppDepartment, UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, email, role, departments } = body as {
      name: string;
      email: string;
      role?: UserRole;
      departments?: AppDepartment[];
    };

    if (!email?.trim() || !name?.trim()) throw new Error("VALIDATION");

    const resolvedRole: UserRole = role === "admin" ? "admin" : "staff";
    let resolvedDepartments: AppDepartment[] = [];
    if (resolvedRole === "staff") {
      const parsed = parseDepartmentIds(departments ?? ["aircraft_management"]);
      if (!parsed || parsed.length === 0) throw new Error("VALIDATION");
      resolvedDepartments = parsed;
    }

    const { email: normalizedEmail, method } = await sendSupabaseInviteEmail(
      email,
      name
    );

    await upsertPendingInvite({
      email: normalizedEmail,
      role: resolvedRole,
      departments: resolvedDepartments,
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
