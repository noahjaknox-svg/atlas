"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

function callbackPathForType(type: string | null) {
  if (type === "invite") return "/auth/callback/invite";
  if (type === "recovery") return "/auth/callback/recovery";
  return "/auth/callback";
}

/**
 * Supabase auth emails may land on the Site URL root (or any page) with tokens or
 * errors in the hash, or with a PKCE ?code= query param — forward to /auth/callback/*.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    const { pathname, search, hash: rawHash } = window.location;
    if (pathname.startsWith("/auth/callback")) return;

    const params = new URLSearchParams(search);
    const hash = rawHash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);

    if (params.get("code")) {
      const type = params.get("type");
      const callbackPath = callbackPathForType(type);
      window.location.replace(`${callbackPath}${search}${rawHash}`);
      return;
    }

    if (hashParams.get("error") || hashParams.get("error_code")) {
      const errorCode = hashParams.get("error_code");
      const loginError =
        errorCode === "otp_expired" ? "auth_callback_failed" : "missing_auth_code";
      window.location.replace(`/login?error=${loginError}`);
      return;
    }

    if (!hash.includes("access_token")) return;
    if (pathname.startsWith("/auth/")) return;

    const next = params.get("next") ?? ROUTES.home;
    const callbackPath = callbackPathForType(hashParams.get("type"));

    window.location.replace(
      `${callbackPath}?next=${encodeURIComponent(next)}${rawHash}`
    );
  }, []);

  return null;
}
