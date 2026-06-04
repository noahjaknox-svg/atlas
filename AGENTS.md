# AGENTS.md

## Cursor Cloud specific instructions

Atlas is a single Next.js 14 app (npm, Prisma, PostgreSQL). See `README.md` for product overview and standard scripts.

### Services

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Required for `npm run dev`, API routes, and client portal (`DATABASE_URL`) |
| **Next.js** (`npm run dev`) | Sole application process |
| **Supabase Auth** | Required only for internal routes (`/login`, `/dashboard`, `/proposals/*`). Client portal (`/{slug}`) does not use Supabase. |

### PostgreSQL on Cloud VMs

If PostgreSQL is not running, start it and ensure the `atlas` database exists:

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER atlas WITH PASSWORD 'atlas' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE atlas OWNER atlas;" 2>/dev/null || true
```

Copy `.env.example` to `.env.local` (and `.env` for Prisma CLI), set `DATABASE_URL` to `postgresql://atlas:atlas@localhost:5432/atlas?schema=public`, and set `PORTAL_SESSION_SECRET` (≥32 chars). Supabase URL/keys are required for internal login; use real project credentials or placeholders (login will not work without a real Supabase project).

After env is configured: `npm run db:push`, `npm run db:seed`.

### Demo client portal (no Supabase)

To exercise the client portal without Supabase:

```bash
npx tsx scripts/seed-demo-portal.ts
```

The script prints `slug`, `pin`, and `portalUrl`. Open the portal URL, enter the PIN, and confirm redirect to `/{slug}/home`.

### Lint / test / build (no external services)

- `npm run lint`
- `npm test` (Vitest, pro forma engine only)
- `npm run build` (runs `prisma generate` + `next build`; does not need Postgres running)

### Dev server

Run `npm run dev` (port 3000). Prefer a tmux session for long-running processes.

### Gotchas

- Prisma loads `DATABASE_URL` from `.env`, not `.env.local` alone — keep both in sync locally or export `DATABASE_URL` when running Prisma commands.
- Publish flow returns a one-time PIN; use `scripts/seed-demo-portal.ts` for repeatable local portal testing.
- There is no Playwright/Cypress E2E suite in the repo.
