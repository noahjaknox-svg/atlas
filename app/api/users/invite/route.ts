import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, email, role } = body as {
      name: string;
      email: string;
      role: "admin" | "sales" | "reviewer";
    };

    if (!email?.trim() || !name?.trim()) throw new Error("VALIDATION");

    const normalizedEmail = email.trim().toLowerCase();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!serviceKey || !supabaseUrl) {
      throw new Error(
        "Cannot send invite emails: configure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL on the server."
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { name: name.trim() },
        redirectTo: `${appUrl}/auth/callback?next=/pipeline`,
      }
    );

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    await prisma.userInvite.create({
      data: {
        email: normalizedEmail,
        role: role ?? "sales",
        invitedBy: admin.id,
        status: "pending",
      },
    });

    return jsonOk({ message: "Invite sent" });
  } catch (e) {
    return handleApiError(e);
  }
}
