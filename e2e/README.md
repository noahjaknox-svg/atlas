# Browser tests (Playwright)

Real-browser checks that run against **staging** (`staging.prismjet.space`) as a signed-in user.
They exist so UI regressions are caught before anyone has to click around to find them.

## Setup (once per machine)

1. `npx playwright install chromium`
2. Create `.env.e2e.local` (gitignored) with:
   ```
   E2E_BASE_URL="https://staging.prismjet.space"
   E2E_SUPABASE_URL="https://wkkgtnaokqhbikblapbp.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="<staging service_role key>"
   E2E_USER_EMAIL="<an internal user on staging>"
   DATABASE_URL / DIRECT_URL  — staging pooler URLs for the atlas_local_dev role (for dev:staging)
   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — staging
   ```
   `atlas_local_dev` is a staging-only Postgres login used just for local dev; staging's own
   postgres password and Vercel config are untouched. Ask whoever set it up to share the URL, or
   create your own role the same way.
   The staging service key is in Supabase → atlas-staging → Settings → API keys.

`global-setup.ts` signs that user in through the app's own magic-link callback (no email is
sent, no password stored). It refuses to run against production.

## Running

- `npm run test:e2e:local` — **before merging**: starts a local dev server on the staging DB
  (`npm run dev:staging`) and runs the tests against it
- `npm run test:e2e` — against the deployed staging site
- `npm run verify -- --e2e` — types + unit tests + browser tests
- Failures leave screenshots and traces: `npx playwright show-report e2e/.report`

## Writing tests

Add a spec for every user-facing fix or feature, asserting what the user would see — e.g. "clicking
the tab shows that tab's content", not just "the URL changed". Keep tests read-only (don't create or
delete data) unless they clean up after themselves.
