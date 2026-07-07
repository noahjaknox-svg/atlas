"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

export type AuthCallbackFlow = "invite" | "recovery";

function safeNextPath(next: string | null) {
  const path = next ?? ROUTES.home;
  return path.startsWith("/") && !path.startsWith("//") ? path : ROUTES.home;
}

function needsPasswordSetup(
  forcedFlow: AuthCallbackFlow | undefined,
  searchParams: URLSearchParams,
  hashParams: URLSearchParams
) {
  if (forcedFlow === "invite" || forcedFlow === "recovery") return true;

  const flow = searchParams.get("flow");
  const hashType = hashParams.get("type");
  const queryType = searchParams.get("type");

  return (
    flow === "invite" ||
    flow === "recovery" ||
    hashType === "invite" ||
    hashType === "recovery" ||
    queryType === "recovery"
  );
}

function resolvePasswordFlow(
  forcedFlow: AuthCallbackFlow | undefined,
  searchParams: URLSearchParams,
  hashParams: URLSearchParams
): AuthCallbackFlow {
  if (forcedFlow) return forcedFlow;

  if (
    hashParams.get("type") === "recovery" ||
    searchParams.get("type") === "recovery" ||
    searchParams.get("flow") === "recovery"
  ) {
    return "recovery";
  }

  return "invite";
}

export function AuthCallbackContent({
  forcedFlow,
}: {
  forcedFlow?: AuthCallbackFlow;
}) {
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
      const mustSetPassword = needsPasswordSetup(forcedFlow, searchParams, hashParams);

      const oauthError = searchParams.get("error");
      if (oauthError) {
        router.replace("/login?error=auth_callback_failed");
        return;
      }

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
        const flow = resolvePasswordFlow(forcedFlow, searchParams, hashParams);
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
  }, [forcedFlow, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-atlas-muted">{message}</p>
    </div>
  );
}

export function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-atlas-muted">Signing you in…</p>
    </div>
  );
}
