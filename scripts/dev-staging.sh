#!/usr/bin/env bash
# Local dev server against the STAGING database + Supabase (settings in .env.e2e.local).
# Refuses to start if anything points at production.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.e2e.local ] || { echo "Missing .env.e2e.local — see e2e/README.md"; exit 1; }
set -a; source .env.e2e.local; set +a
for v in DATABASE_URL DIRECT_URL NEXT_PUBLIC_SUPABASE_URL; do
  case "${!v:-}" in *wkkgtnaokqhbikblapbp*) ;; *) echo "✗ $v is not staging — refusing to start"; exit 1;; esac
done
# Override values that only make sense on the deployed site.
export NEXT_PUBLIC_SITE_URL="http://localhost:${PORT:-3005}" NEXT_PUBLIC_APP_URL="http://localhost:${PORT:-3005}"
# Vercel-pulled secrets come through as "[SENSITIVE]" placeholders. Treat them as unset
# (third-party APIs like EIA/iFlightPlanner degrade gracefully) and use a throwaway portal secret.
for v in $(env | grep '=\[SENSITIVE\]$' | cut -d= -f1); do unset "$v"; done
: "${PORTAL_SESSION_SECRET:=local-dev-$(openssl rand -hex 16)}"; export PORTAL_SESSION_SECRET
unset VERCEL VERCEL_ENV VERCEL_URL VERCEL_TARGET_ENV VERCEL_OIDC_TOKEN
npx prisma generate >/dev/null
# Env vars already set win over .env.local, so production values there are never used.
exec npx next dev -p "${PORT:-3005}"
