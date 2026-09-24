# Atlas — Working Rules

## Branch workflow (production safety)

This repo has two live environments:

- **Production** — Vercel project `atlas` (team `prism-jet`), deploys from the `main` branch, serves `www.prismjet.space`. Database: Supabase project `atlas` (ref `hfasfrtyigtvvmwqaihb`).
- **Staging** — Vercel project `atlas-staging` (team `prism-jet`), deploys from the `staging` branch, serves `staging.prismjet.space`. Database: Supabase project `atlas-staging` (ref `wkkgtnaokqhbikblapbp`) — fully separate from production, safe to break.
  - In that Vercel project, `staging` is the **Production** branch and `staging.prismjet.space` is its production domain. Keep it that way: Vercel's Standard Protection exempts only production custom domains, so if the domain slides back to a Preview/branch domain, Vercel's team-login wall intercepts every Supabase auth redirect (reset/invite links break). Raw `*.vercel.app` preview URLs are still Vercel-login-gated.

**Rules for agents and humans alike:**

1. **Never push directly to `main`.** GitHub branch protection enforces this (no direct pushes, even for admins) — but don't attempt to work around it. All production changes go through a pull request into `main`.
2. **Do your work on a feature branch**, merge it into `staging` first, and verify it on `staging.prismjet.space` before opening a PR into `main`.
3. **`staging` is the test sandbox** — direct pushes/merges there are fine, no PR required. It's expected to occasionally be broken.
4. **Never merge `staging` → `main` (or open that PR) without the user explicitly asking for it in that conversation.** Getting a feature working on staging is not implicit permission to promote it to production.
5. **Never modify environment variables, database connection strings, or Vercel/Supabase project settings for the `atlas` (production) project without explicit user confirmation for that specific action.** The `atlas-staging` project's config can be treated more freely, but still confirm before changing anything DB-connection-related.
6. **Never run destructive database commands** (`prisma db push --accept-data-loss`, direct `DROP`/`DELETE` without a `WHERE`, migration resets) **against the production database** without explicit confirmation. These are fine on staging.
   - Local scripts load `.env.local` (usually production) and then **replace `DATABASE_URL` with `DIRECT_URL`** (`lib/load-env.ts`). To target staging, pass **both** `DATABASE_URL` and `DIRECT_URL` inline. Seed/import scripts call `guardAgainstProductionDb()` (`lib/db-target-guard.ts`) and refuse production unless `ALLOW_PRODUCTION_DB=yes`. Add that call to any new script that bulk-writes or deletes.

## Testing before handing work back

Nothing user-facing is "done" until it has been exercised in a real browser. Workflow for every change:

1. `npm run verify` on the feature branch (types + unit tests).
2. For any UI/route change, add or update a Playwright spec in `e2e/` that asserts what the user sees (see `e2e/README.md`).
3. Merge to `staging`, wait for the atlas-staging deploy to be Ready, then run `npm run test:e2e` against staging.
4. Only report the work as done once those pass. If something couldn't be verified (e.g. no test covers it yet and no browser was available), say so explicitly — never imply it was tested.

## Auth email templates

Supabase auth emails come from `email-templates/supabase/` but must be pasted into each Supabase project's dashboard by hand — see that folder's README. Reset/invite/confirm links use `token_hash` + `verifyOtp` on click, not `{{ .ConfirmationURL }}`; don't revert that (scanners spend `/verify` GET links before the user clicks).

## Schema changes: Prisma vs. raw SQL

Two systems exist in this repo — `prisma/schema.prisma` + `prisma/migrations`, and `supabase/migrations/*.sql`. The intended split, going forward:

- **Table/column changes**: edit `schema.prisma`, then run `npm run db:migrate` (`prisma migrate dev --name X`) to generate a tracked migration file. Don't use `db push` as the normal workflow — it has no history and is meant for one-off local resyncs only.
- **`supabase/migrations/*.sql`**: reserved for things Prisma can't express — RLS policies, triggers (e.g. the snapshot-immutability guard), storage buckets. New files here should be created with `supabase migration new <name>` (gives a proper unique timestamped filename) — don't hand-pick the next sequential number; this repo already hit a real duplicate-version collision from doing that historically.
- **Order when a change needs both**: land the Prisma table/column migration first, then apply the SQL file after (policies/triggers reference tables that must already exist).
- **How these actually reach each environment**: no CI exists in this repo. On **staging**, once the Supabase GitHub integration is enabled (production branch name set to `staging`, not `main`), new `supabase/migrations` files auto-apply when merged to `staging`. Prisma migrations are NOT covered by that integration — `prisma migrate deploy` is still a manual step, run by whoever's shipping the change, staging first. **Production has no automation for either system** — both are manual, deliberate steps.
- **Known gap**: this repo's historical `supabase/migrations` (001–034) were applied by hand over time, never through Supabase's own CLI tracking — so when staging was bootstrapped via `prisma db push`, only the Prisma-tracked schema came along. Storage buckets and RLS/trigger side-effects from those files were NOT automatically replayed and needed manual verification/fixing (the `proposal-media` bucket was found missing on staging and created manually on 2026-09-02; RLS policy / snapshot-trigger presence on staging has not yet been separately verified — treat as unconfirmed until checked).

## Stack

Next.js 14 App Router, TypeScript, Prisma ORM, Supabase Postgres, Zod validation.

## Local dev

- `.env.local` is gitignored — copy from `.env.example` and fill in credentials.
- `npm run dev` — starts the dev server (port 3005).
- `npm run db:push` — syncs `prisma/schema.prisma` to whatever DB `.env.local` points at (accepts data loss — local/staging only).
- `npm run db:migrate` — `prisma migrate dev`, for authoring new migrations locally.
- Note: this repo's migration history only covers changes since `20250626210000`. Earlier schema was established via `db push`, not migrations — a brand-new empty database needs `db push` once before `prisma migrate deploy` will apply cleanly (see `docs/data-warehouse-expansion-scoping.md` for how this was handled bootstrapping staging).
