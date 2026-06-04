# Atlas by PrismJet

Internal web application for personalized aircraft management proposals and financial pro formas. Built per the V1 product spec for Cursor-assisted development.

## Stack

- **Next.js 14** (App Router) · TypeScript · Tailwind CSS
- **Supabase** (Auth + Postgres) · **Prisma ORM** · Vercel-ready

## Quick start

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   - `DATABASE_URL` — Supabase Postgres connection string
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `PORTAL_SESSION_SECRET` — at least 32 random characters
   - `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Supabase Auth**

   Create users in Supabase Auth, then sync to `users` table with matching email and role (`admin` | `sales` | `reviewer`).

5. **Run**

   ```bash
   npm run dev
   ```

   - Internal: [http://localhost:3000/login](http://localhost:3000/login) → Dashboard
   - Client portal: `/{slug}` after publishing a proposal

## Project structure

```
app/
  (internal)/     dashboard, proposals wizard
  [slug]/         client PIN gate, home, pro forma, sections
  api/            REST routes per spec §9
components/
  ui/             design system (dark luxury theme)
  internal/       wizard, dashboard
  client/         portal, pro forma
lib/
  proforma.ts     formula engine (unit tested)
  snapshot.ts     immutable publish payload
  auth.ts         Supabase + portal session cookies
prisma/           schema + seed
supabase/         RLS + snapshot trigger SQL
```

## Key business rules

- Clients access via **slug + PIN** only — no accounts
- Published proposals render from **`proposal_snapshots.snapshot_json`** only
- Clients may edit **aircraft value** and **owner annual hours** — stored in `client_scenarios`
- PINs stored as **bcrypt** hashes (cost 12)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:seed` | Reference aircraft, airports, features |
| `npm test` | Pro forma unit tests |

## V1 build status

Foundation implemented per recommended build order:

- [x] Prisma schema (extensible, future-proof fields)
- [x] Seed data (aircraft, airports, features, operating models)
- [x] Pro forma engine + tests
- [x] Snapshot creation on publish
- [x] Internal dashboard + 10-step wizard shell
- [x] Client portal (PIN, home, sections, interactive pro forma)
- [x] API routes (internal + portal)
- [ ] Full wizard field coverage (all spec fields per step)
- [ ] Rich text sections + drag reorder
- [ ] Server-side PDF generation
- [ ] Supabase user sync webhook
- [ ] Demo proposals seed

## License

Proprietary — PrismJet internal use.
