import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const invite = await prisma.userInvite.findUnique({ where: { id } });
    if (!invite) throw new Error("NOT_FOUND");

    const email = invite.email.toLowerCase();
    await prisma.userInvite.delete({ where: { id } });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && supabaseUrl) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      let page = 1;
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const match = data.users.find((u) => u.email?.toLowerCase() === email);
        if (match) {
          await supabase.auth.admin.deleteUser(match.id);
          break;
        }
        if (data.users.length < 200) break;
        page += 1;
      }
    }

    return jsonOk({ message: "Invite revoked" });
  } catch (e) {
    return handleApiError(e);
  }
}
