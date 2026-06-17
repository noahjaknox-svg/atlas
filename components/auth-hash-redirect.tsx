"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

/** Invite emails may land on Site URL root with #access_token — forward to /auth/callback. */
export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    if (window.location.pathname.startsWith("/auth/")) return;

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const isInvite = hashParams.get("type") === "invite";
    const next = params.get("next") ?? ROUTES.home;
    const flow = isInvite ? "&flow=invite" : "";

    window.location.replace(
      `/auth/callback?next=${encodeURIComponent(next)}${flow}${hash}`
    );
  }, []);

  return null;
}
