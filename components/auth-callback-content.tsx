"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
    queryType === "recovery" ||
    queryType === "invite" ||
    queryType === "signup"
  );
}

const TOKEN_HASH_TYPES = ["recovery", "invite", "signup", "email", "magiclink"] as const;
type TokenHashType = (typeof TOKEN_HASH_TYPES)[number];

function tokenHashParams(
  searchParams: URLSearchParams
): { tokenHash: string; type: TokenHashType } | null {
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!tokenHash || !type) return null;
  if (!(TOKEN_HASH_TYPES as readonly string[]).includes(type)) return null;
  return { tokenHash, type: type as TokenHashType };
}

class LinkExpiredError extends Error {}

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
  const [linkDead, setLinkDead] = useState(false);

  // Recovery/invite emails link straight here with a single-use token_hash
  // (see email-templates/supabase/). Email security scanners (Microsoft Safe
  // Links, Proofpoint, etc.) load links in a headless browser before a human
  // clicks; verifying on page load would let them spend the token. Only an
  // explicit click calls verifyOtp.
  const tokenHash = tokenHashParams(searchParams);
  const requiresManualConfirm =
    forcedFlow === "invite" || forcedFlow === "recovery" || tokenHash !== null;

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
    if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash.tokenHash,
        type: tokenHash.type,
      });
      if (error || !data.user?.email) {
        throw new LinkExpiredError(error?.message ?? "Link could not be verified");
      }
    } else if (code) {
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
    } catch (e) {
      setConfirming(false);
      if (e instanceof LinkExpiredError) {
        // The token is spent or expired; retrying the same link can't work.
        setLinkDead(true);
        return;
      }
      started.current = false;
      setConfirmError("Something went wrong. Check your connection and try again.");
    }
  }

  const isInvite =
    forcedFlow === "invite" || tokenHash?.type === "invite" || tokenHash?.type === "signup";

  if (linkDead) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-atlas-text">This link has expired or was already used</p>
          <p className="mt-1 text-xs text-atlas-muted">
            {isInvite
              ? "Ask your admin to resend the invite."
              : "Request a new reset link from the sign-in page."}
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (requiresManualConfirm && !confirming && !started.current) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-atlas-text">
            {isInvite ? "Accept your invite" : "Continue resetting your password"}
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
