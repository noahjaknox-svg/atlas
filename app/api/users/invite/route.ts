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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabase.auth.admin.inviteUserByEmail(email.trim(), {
        data: { name: name.trim() },
      });
    }

    await prisma.userInvite.create({
      data: {
        email: email.trim().toLowerCase(),
        role: role ?? "sales",
        invitedBy: admin.id,
        status: "pending",
      },
    });

    return jsonOk({
      message: serviceKey
        ? "Invite sent"
        : "Invite recorded (configure SUPABASE_SERVICE_ROLE_KEY to email)",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
