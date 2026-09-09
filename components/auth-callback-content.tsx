"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Recovery/invite links carry a single-use code. Corporate and provider
  // email security scanners (Microsoft Safe Links, Proofpoint, etc.) load
  // links like this one in a headless browser to check them for safety
  // *before* a human ever clicks — which silently consumes the one-time
  // code, so the real user always lands on "expired". Requiring an explicit
  // click before exchanging the code means only an actual click can consume
  // it; a scanner loading the page in the background never triggers it.
  const requiresManualConfirm = forcedFlow === "invite" || forcedFlow === "recovery";

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
      router.replace(`/auth/set-password?flow=${flow}&next=${encodeURIComponent(next)}`);
      return;
    }

    router.replace(next);
  }

  useEffect(() => {
    if (requiresManualConfirm) return;
    if (started.current) return;
    started.current = true;

    void finishSignIn().catch(() => {
      router.replace("/login?error=auth_callback_failed");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedFlow, router, searchParams]);

  async function handleConfirm() {
    if (started.current) return;
    started.current = true;
    setConfirming(true);
    setConfirmError("");
    try {
      await finishSignIn();
    } catch {
      started.current = false;
      setConfirming(false);
      setConfirmError("That link expired or was already used. Request a new one.");
    }
  }

  if (requiresManualConfirm && !confirming && !started.current) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-atlas-text">
            {forcedFlow === "invite" ? "Accept your invite" : "Continue resetting your password"}
          </p>
          <p className="mt-1 text-xs text-atlas-muted">
            For security, this link is only used when you click below.
          </p>
          {confirmError ? (
            <p className="mt-3 rounded-md border border-atlas-danger/30 bg-atlas-danger/10 px-3 py-2 text-sm text-atlas-danger">
              {confirmError}
            </p>
          ) : null}
          <Button type="button" onClick={() => void handleConfirm()} className="mt-4 w-full">
            Continue
          </Button>
        </div>
      </div>
    );
  }

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
