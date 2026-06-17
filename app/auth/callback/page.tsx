"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

function safeNextPath(next: string | null) {
  const path = next ?? ROUTES.home;
  return path.startsWith("/") && !path.startsWith("//") ? path : ROUTES.home;
}

function needsPasswordSetup(
  searchParams: URLSearchParams,
  hashParams: URLSearchParams
) {
  const flow = searchParams.get("flow");
  const hashType = hashParams.get("type");
  const queryType = searchParams.get("type");

  return (
    flow === "invite" ||
    hashType === "invite" ||
    hashType === "recovery" ||
    queryType === "recovery"
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishSignIn() {
      const supabase = createClient();
      const next = safeNextPath(searchParams.get("next"));
      const hash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);
      const mustSetPassword = needsPasswordSetup(searchParams, hashParams);

      const code = searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user?.email) {
          router.replace("/login?error=auth_callback_failed");
          return;
        }
      } else {
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          router.replace("/login?error=missing_auth_code");
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data.user?.email) {
          router.replace("/login?error=auth_callback_failed");
          return;
        }
      }

      setMessage("Setting up your account…");

      const provisionRes = await fetch("/api/auth/provision", { method: "POST" });
      if (!provisionRes.ok) {
        await supabase.auth.signOut();
        router.replace("/login?error=not_provisioned");
        return;
      }

      if (mustSetPassword) {
        const flow =
          hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery"
            ? "recovery"
            : "invite";
        router.replace(
          `/auth/set-password?flow=${flow}&next=${encodeURIComponent(next)}`
        );
        return;
      }

      router.replace(next);
    }

    void finishSignIn().catch(() => {
      router.replace("/login?error=auth_callback_failed");
    });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-atlas-muted">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-atlas-muted">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
