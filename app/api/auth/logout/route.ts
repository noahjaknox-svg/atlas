import { createSupabaseServerClient } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return jsonOk({ ok: true });
}
