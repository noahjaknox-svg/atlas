import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { provisionInternalUserFromAuth } from "@/lib/provision-internal-user";

/** Exchange Supabase auth codes from invite / password-reset emails for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/pipeline";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_auth_code`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/login?error=auth_not_configured`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const atlasUser = await provisionInternalUserFromAuth(
    data.user.email,
    data.user.user_metadata?.name ?? data.user.email
  );

  if (!atlasUser) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_provisioned`);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/pipeline";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
