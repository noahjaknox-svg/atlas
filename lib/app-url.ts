import { ROUTES } from "@/lib/routes";

/** Canonical production site — used for invite emails and client portal links. */
export const PRODUCTION_SITE_URL = "https://www.prismjet.space";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function isLocalDevUrl(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * URL for links sent to external users (invites, password reset, client portals).
 * Never returns localhost — local dev still emails production links.
 */
export function getExternalAppUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return normalizeUrl(siteUrl);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && !isLocalDevUrl(appUrl)) {
    return normalizeUrl(appUrl);
  }

  return PRODUCTION_SITE_URL;
}

/** @deprecated Prefer getExternalAppUrl for user-facing links. */
export function getAppBaseUrl(): string {
  return getExternalAppUrl();
}

export function getInviteRedirectUrl(): string {
  return `${getExternalAppUrl()}/auth/callback/invite`;
}

export function getPasswordResetRedirectUrl(): string {
  return `${getExternalAppUrl()}/auth/callback/recovery`;
}

/** Add these under Supabase → Authentication → URL Configuration → Redirect URLs. */
export function getRequiredSupabaseRedirectUrls(): string[] {
  const base = getExternalAppUrl();
  return [
    `${base}/auth/callback/recovery`,
    `${base}/auth/callback/invite`,
    `${base}/auth/callback`,
    `${base}/**`,
    "http://localhost:3005/auth/callback/recovery",
    "http://localhost:3005/auth/callback/invite",
    "http://localhost:3005/auth/callback**",
  ];
}

export function getAuthCallbackUrl(next: string = ROUTES.home): string {
  return `${getExternalAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
