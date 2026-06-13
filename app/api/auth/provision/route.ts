import { createSupabaseServerClient } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api";
import { provisionInternalUserFromAuth } from "@/lib/provision-internal-user";

/** Create Atlas user row after Supabase session is established (invite callback). */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return jsonError("Unauthorized", 401);
  }

  const atlasUser = await provisionInternalUserFromAuth(
    user.email,
    user.user_metadata?.name ?? user.email
  );

  if (!atlasUser) {
    await supabase.auth.signOut();
    return jsonError("Your account is not provisioned in Atlas yet.", 403);
  }

  return jsonOk({ success: true });
}
