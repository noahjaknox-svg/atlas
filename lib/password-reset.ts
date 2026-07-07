import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPasswordResetRedirectUrl } from "@/lib/app-url";

async function createSupabaseAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
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
}

function requireSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    throw new Error(
      "Cannot send password reset: configure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertRecoveryRedirectAccepted(actionLink: string, redirectTo: string) {
  let redirectParam: string | null = null;
  try {
    redirectParam = new URL(actionLink).searchParams.get("redirect_to");
  } catch {
    throw new Error("Supabase returned an invalid password reset link.");
  }

  if (!redirectParam) return;

  const decoded = decodeURIComponent(redirectParam);
  if (decoded.includes("/auth/callback/recovery")) return;

  throw new Error(
    `Supabase rejected the password reset redirect. Add "${redirectTo}" under Authentication → URL Configuration → Redirect URLs, save, then try again.`
  );
}

export async function sendPasswordResetEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("VALIDATION");
  }

  const redirectTo = getPasswordResetRedirectUrl();
  const admin = requireSupabaseAdmin();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (linkError) {
    throw new Error(linkError.message);
  }

  const actionLink = linkData.properties?.action_link;
  if (!actionLink) {
    throw new Error("Supabase did not return a password reset link.");
  }

  assertRecoveryRedirectAccepted(actionLink, redirectTo);

  const supabase = await createSupabaseAnonServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { email: normalizedEmail };
}
