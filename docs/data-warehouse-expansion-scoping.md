# Aircraft Data Warehouse Expansion — Conklin & de Decker Research + FAA Registry Ingestion Scoping

Branch: `feature/data-warehouse-expansion`
Status: research/scoping only — no schema or code changes yet.

This doc covers the first two items from the data-warehouse expansion plan: (1) whether Conklin & de Decker operating-cost data can actually be warehoused, and (2) a concrete ingestion plan for the FAA Releasable Aircraft Registry.

---

## 1. Conklin & de Decker (JSSI) — operating cost data

### Access method
No public API exists. It's a login-gated web portal (`conklindedecker.jetsupport.com`) with manual export to Word/Excel/PDF. No integrator has publicly documented an automated pull from it — this is a "someone logs in and exports" data source, not a feed.

### What it covers vs. what we already have
It provides per-**variant** (not per-family) fixed/variable operating costs, performance, and acquisition-cost benchmarks — e.g. fuel burn, maintenance $/hr, crew, hangar, insurance, cost/hr, cost/nm. Our [`AircraftType`](../prisma/schema.prisma) model ([prisma/schema.prisma:249](../prisma/schema.prisma#L249)) already stores a lot of this shape natively (`fuelGallonsPerHour`, `maintenanceReserve`, `airframeProgram`, `engineProgram`, `charterHourlyRate`, pilot/crew salary fields, etc.) — so the overlap is real. C&D's value-add would mainly be as an **independent benchmark/default-seeding source** for new aircraft types we haven't manually configured yet, not a wholesale replacement of the existing model.

### Licensing — the blocker
Their Terms of Use (last updated Jan 2021) grants a license "for Your internal business purposes" only, explicitly prohibiting reproduction, distribution, or derivative works, and treats the content as confidential. It doesn't name "database" or "API" specifically, but systematically ingesting it into our warehouse to power a separate proposal-generation product is a plausible breach of that language — this is not a clean "yes we can warehouse it" situation.

### Recommendation
Don't build an ingestion pipeline against the current ToS. Two paths forward if we still want this data:
1. **Get written sign-off from JSSI** for warehousing/internal-tool use — worth a direct call before investing engineering time, since our use case (seeding cost defaults) is arguably still "internal."
2. Use it as a **manual reference** — someone with a login periodically checks new aircraft types against it and updates `AircraftType` defaults by hand (no ingestion pipeline, no ToS risk). This is realistic for us since we add new aircraft types infrequently.

**Alternative worth a look**: [Vref](https://vref.com/api-for-business/) has a documented API (valuation/registration/market data) — if operating-cost line items are in scope there too, it's a cleaner path than C&D. Worth a follow-up research pass if we want to pursue this further.

---

## 2. FAA Releasable Aircraft Registry — ingestion scoping

### Source
Bulk ZIP at `https://registry.faa.gov/database/ReleasableAircraft.zip` (~500MB uncompressed), refreshed **daily at 11:30pm CT**, full-file replacement (no delta API). Comma-delimited `.txt` files, UTF-8 with BOM, **every row ends in a trailing comma** — a real parsing gotcha to handle.

Files we'd use:
- `MASTER.txt` — one row per registered aircraft (N-Number, owner, mfr/model codes, status, dates). 612-char records.
- `ACFTREF.txt` — aircraft mfr/model code → make/model/type/seats/weight class lookup.
- `ENGINE.txt` — engine mfr/model code → engine type/thrust lookup.
- `DEREG.txt` — deregistered aircraft.
- `DEALER.txt` — dealer certificate holders (lower priority).

No standard ICAO type designator exists in this data — `ACFTREF.txt`'s model code is FAA-proprietary, so joining to our `AircraftType.modelCode`/`code` fields will need a manually maintained crosswalk table, not a direct join.

### PII handling — important
Owner PII (name/address) for aircraft enrolled in the FAA's **"Request to Withhold Aircraft Ownership Data"** program (49 U.S.C. §44114, distinct from the unrelated LADD flight-tracking opt-out) is blanked in the released file going forward. There's no FAA statutory restriction on using this data for solicitation (49 U.S.C. §44711 doesn't apply here, and no other section prohibits it) — but we should still:
- Never backfill/retain owner PII for an N-Number after it enters the withholding program (diff against the daily file and purge on withdrawal, not just skip future updates).
- Gate any UI/export surfacing owner PII behind `requireDepartmentAccess` (same pattern used for `app/api/data/usage-types/route.ts`), scoped to whichever department handles lead sourcing.

### Proposed schema (new models, additive — doesn't touch `AircraftType`)

```prisma
model FaaAircraftRegistration {
  id                String    @id @default(uuid()) @db.Uuid
  nNumber           String    @unique @map("n_number")
  serialNumber      String?   @map("serial_number")
  mfrModelCode      String?   @map("mfr_model_code")
  engineMfrModelCode String?  @map("engine_mfr_model_code")
  yearMfr           Int?      @map("year_mfr")
  typeRegistrantCode String?  @map("type_registrant_code")
  registrantName    String?   @map("registrant_name")  // null when PII-withheld
  registrantStreet1 String?   @map("registrant_street1")
  registrantCity    String?   @map("registrant_city")
  registrantState   String?   @map("registrant_state")
  registrantZip     String?   @map("registrant_zip")
  statusCode        String?   @map("status_code")
  lastActivityDate  DateTime? @map("last_activity_date")
  certificateIssueDate DateTime? @map("certificate_issue_date")
  expirationDate    DateTime? @map("expiration_date")
  fractionalOwner   Boolean?  @map("fractional_owner")
  piiWithheld       Boolean   @default(false) @map("pii_withheld")
  sourceVersion     String    @map("source_version") // date stamp of the daily snapshot
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("faa_aircraft_registration")
}

model FaaAircraftRefModel {
  id           String  @id @default(uuid()) @db.Uuid
  mfrModelCode String  @unique @map("mfr_model_code")
  manufacturer String?
  model        String?
  typeAircraft String? @map("type_aircraft")
  numSeats     Int?    @map("num_seats")
  numEngines   Int?    @map("num_engines")

  @@map("faa_aircraft_ref_model")
}
```

Deliberately **not** joining `FaaAircraftRegistration` directly to `AircraftType` at the DB level — the mfr/model-code crosswalk isn't reliable enough to enforce as a foreign key yet. Resolve it in application code via `FaaAircraftRefModel`, same way `lib/ourairports/lookup.ts` resolves ICAO codes today.

### Ingestion scripts (mirrors the OurAirports pattern exactly)

- `scripts/download-faa-registry.ts` — fetch the ZIP to `data/faa-registry/`, unzip, log file sizes. Same shape as [`scripts/download-ourairports.ts`](../scripts/download-ourairports.ts).
- `lib/faa-registry/csv.ts` — trailing-comma-aware CSV parser (the OurAirports parser assumes clean CSV; this needs a small variant), plus `parseIntOrNull`/`parseFloatOrNull`/date parsers matching `lib/ourairports/csv.ts` conventions.
- `lib/faa-registry/import-data.ts` — `importFaaRegistryData(prisma, { dataPath, sourceVersion })`, following [`lib/ourairports/import-data.ts`](../lib/ourairports/import-data.ts)'s batched-`createMany` pattern (batch size 2000). Given the file is a full daily replacement, use the same delete-then-recreate approach OurAirports uses, **except**: before deleting, diff old vs. new `MASTER.txt` by `nNumber` to detect new registrations/transfers/PII-withdrawals for a `newRegistrations`/`piiWithdrawn` summary in the import result — this is the actual "lead detection" signal the sales-pipeline use case needs.
- `scripts/import-faa-registry.ts` — thin CLI wrapper, same shape as `scripts/import-ourairports.ts`.
- `scripts/verify-faa-registry.ts` — spot-check row counts + a known N-Number lookup, same shape as `scripts/verify-ourairports.ts`.
- `package.json` — add `db:faa-registry-download` / `db:faa-registry-import` scripts alongside the existing `db:ourairports-*` ones.

### Open question for you
Do we want the "new registration / ownership transfer" diff to be a first-class output of the import (e.g. a `FaaRegistrationEvent` table sales can query), or just a console log for now until the client-pipeline feature is scoped? I'd lean toward logging only for this first pass and building the event table once we know how sales actually wants to consume leads.

---

## Next steps
Nothing has been implemented yet. If this scoping looks right, next would be: add the two new Prisma models + migration, then the download/import/verify script trio for FAA registry only (Conklin & de Decker stays manual-reference per above unless you get JSSI sign-off).
