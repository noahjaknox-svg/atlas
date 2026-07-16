# PrismJet Crew ↔ Atlas API (v1 contract)

Internal reference for the read-only Crew integration. **Wire field names match `crew_data_sample.json`** (canonical). Initial seed from `atlas_initial_data.json`.

## Division of work

| Layer | Owner |
|-------|--------|
| Database, admin UI, read API, OpenAPI | Atlas |
| Trip UI, interpolation, go/no-go, `FleetStore.refresh()` | Crew (iOS) |

## Units

| Quantity | API unit | Notes |
|----------|----------|--------|
| Weight | **lb** | |
| Length (takeoff / landing) | **ft** | |
| Pressure altitude | **ft** | |
| Temperature | **°C** | Crew converts to °F in UI |
| Speed | **kts** | cruise TAS |

## Authentication (v1)

- Read-only **scoped API key** via `Authorization: Bearer <key>`
- Set `CREW_API_KEY` in server environment (see `.env.example`)
- No cookie auth
- Bearer JWT (Supabase / per-crew) planned as follow-up

## Admin UI

Data Hub → **Aircraft types** (`/data?tab=aircraft`) for commercial + empty-leg type defaults, and **Fleet & performance** (`/data?tab=performance-data`) for Crew grids + tails.

Atlas owns the database — add types, grids, and tails here (not by editing Supabase directly).

### Unified Type + Tail

| Record | Owns |
|--------|------|
| **AircraftType** | Identity, base performance (fuel burn), Crew POH grids, AM economics, empty-leg **default** hourly rate |
| **AircraftTail** | Tail/serial/home base, **actual weights** (BEW/MTOW/MZFW), remaining operating factors, empty-leg marketing + rate **override** |

Empty-leg calculated price uses `Tail.emptyLegHourlyRateOverride ?? Type.emptyLegHourlyRate`.

### Adding a new aircraft type

Create all three so the type flows through `GET /api/v1/crew/sync`:

1. **Aircraft type** — code (e.g. `C25B`), manufacturer, model (+ AM / empty-leg defaults on Aircraft types tab)
2. **Performance grids** for that type — `takeoffFieldLength` and `landingDistance`
3. **One or more tails** of that type, each with actual weights and operating factors

**In the UI today:**

- Types commercial fields: Data Hub → Aircraft types
- Step 2–3: Fleet & performance tab (types table + Add tail dialog + performance import)
- Step 2 grids: AFM upload on Fleet & performance (same shape as `/sync` `performance[]` + optional `performanceModel`), or **Load POH seed** / `POST /api/data/crew-import` from `atlas_initial_data.json`

Per-tail **full `operating{}`** ships on `/sync` (Crew does not merge type→tail). Type defaults in admin only seed new tails. **No CG** yet.

Canonical Crew type codes: **B300**, **CL35**, **LR45** (`LJ45` aliases to `LR45` on the wire).

Each type on `/sync` includes **`afmStatus`**: `complete` | `partial` | `missing` (+ optional `afmNotes`).

## Local setup

```bash
npm run db:push
npm run db:crew-seed
```

Set `CREW_API_KEY` in `.env.local`, then:

```bash
curl -H "Authorization: Bearer <CREW_API_KEY>" http://localhost:3000/api/v1/crew/sync
```

## Performance model (v1)

- **(B) Client tables** — full grids downloaded for offline use; Crew interpolates on-device
- Performance attaches to **aircraft type**, not tail (optional per-tail overrides later)
- **Takeoff:** POH grid (11 PA × 10 weight × 9 OAT for B300); `null` outside certified envelope
- **Landing:** same axes as takeoff; planning model from Crew’s calibrated data (not POH transcription); replaceable later without API shape change
- **(A) Compute endpoint** — optional future online cross-check, not v1

## Fleet

Operational PrismJet charter registry — **independent of sales proposals**.

### Required tail fields

- `tailNumber`
- `aircraftTypeId` (and/or `aircraftTypeCode` per sample)
- `operating` — full block (see below)

### Optional tail fields (v1)

- `status` — `active` | `retired` (recommended)
- `homeBase` — ICAO (recommended)
- `serialNumber` (optional)

### `operating` block (on each tail for v1)

Ships on the aircraft record to match Crew’s current model. Admin UI: **basic empty weight** is per-tail (from weighings); other fields editable per tail for v1; type-level / policy normalization deferred.

**Passenger weights — two fields, not one:**

- `paxWeightSummer` (e.g. 190 lb)
- `paxWeightWinter` (e.g. 195 lb)

**GOM runway factors — semantic names, not value-based:**

| Wire name | Meaning |
|-----------|---------|
| `landingRunwayPercent` | GOM landing runway factor (was “60”) |
| `alternateRunwayPercent` | GOM alternate factor (was “70”) |
| `wetRunwayPercent` | GOM wet runway factor (was “15”) |

Do **not** use `gomFactor60` / `gomFactor70` / `gomFactor15` on the wire.

Other `operating` keys: match `crew_data_sample.json` exactly (MTOW, MZFW, fuel, crew, burn/taxi/reserve, cruise, route %, seats, max bag, `singleRunwayAlternate`, etc.).

## Endpoints (v1)

Base: `/api/v1/crew`

### Primary — full offline sync

```
GET /api/v1/crew/sync
Authorization: Bearer <read-only-api-key>
```

Optional: `?ifModifiedSince=<ISO8601>` for conditional refresh (exact 304 vs `{ unchanged: true }` TBD).

Response includes:

- `syncedAt`
- `aircraftTypes[]` — type catalog with `updatedAt`; optional `performanceModel`; **`afmStatus`** (`complete` | `partial` | `missing`) + optional `afmNotes`
- `fleet[]` — tails with full `operating` block and `updatedAt`
- `performance[]` — per-type takeoff + landing grids (`metric`, `unit`, `axes`, `values`, optional `source`, `updatedAt`)
- `airports[]` — home-base airports (same shape as `/airports`; optional `timeZone`)
- `policy` — org runway / alternate thresholds (Crew PolicyStore; editable in Data Hub)

Granular routes (`/fleet`, `/aircraft-types`, `/performance/{typeId}`) optional; v1 integration targets **`/sync` only**.

## Errors

```json
{ "error": "message" }
```

Standard HTTP status codes (401, 404, etc.).

## Caching / offline

- Crew caches full fleet + tables on-device
- Re-sync on launch / when online using per-resource `updatedAt` and top-level `syncedAt`
- ETag / caching headers — later enhancement

## Environments

| Env | URL |
|-----|-----|
| Staging / Production | `https://www.prismjet.space` |

## Airports (OurAirports reference)

ICAO-keyed open data from [OurAirports](https://ourairports.com/data/). Load with `npm run db:ourairports-download` then `npm run db:ourairports-import`.

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/crew/airports` | Full offline catalog — `{ syncedAt, count, airports[] }` |
| `GET /api/v1/crew/airports/search?q=` | Search by ICAO, IATA, name, or city (max 50) |
| `GET /api/v1/crew/airports/{icao}` | Single airport (same object shape as catalog entries) |
| `GET /api/v1/crew/sync` | Fleet + performance + `airports[]` for each fleet `homeBase` ICAO |

### Airport object wire names (Crew parser)

Each airport in `GET /api/v1/crew/airports` uses these **exact** field names:

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | ICAO code (e.g. `KSEZ`) |
| `name` | string | Airport name |
| `city` | string \| null | Municipality |
| `elevationFt` | integer \| null | Field elevation (ft) |
| `longestRunwayFt` | integer \| null | Longest open runway (ft) |
| `runwayId` | string \| null | Primary runway designator, e.g. `03/21` |
| `lat` | number \| null | WGS84 latitude |
| `lon` | number \| null | WGS84 longitude |
| `timeZone` | string (optional) | IANA zone (e.g. `America/Phoenix`); omit when unknown — never raw offsets |
| `gradientPct` | number \| null | Primary runway verified slope (%); null = level |
| `gradientHighEndRunway` | string \| null | Higher runway end ident on primary runway |
| `terrain` | boolean | Apply terrain correction in Crew when true |
| `multiRunway` | boolean | More than one open runway |
| `updatedAt` | string (ISO8601) | Per-airport timestamp |
| `runways` | array | Per-runway detail (same gradient fields repeated) |

`?ifModifiedSince=` works like `/sync`: returns `unchanged: true` with `count: 0` and empty `airports[]` when nothing is newer.

Sample: `data/seeds/crew-airports-sample.json` (KSEZ + KPHX + KSDL).

Atlas internal UI uses the same reference via `GET /api/airports/search` and `GET /api/airports/{icao}` (session auth), merged with Atlas hangar/fuel/FBO pricing when available.

## Deliverables to Crew

1. Staging base URL + read-only API key
2. 2–3 real `/sync` sample responses
3. OpenAPI when stable

## Wire format (Crew app)

`/sync` matches the live app export (`atlas_initial_data.json`):

- **Fleet** `aircraftTypeId` = type code (e.g. `B300`), not UUID
- **Operating** app field names: `basicEmptyWeight`, `maxTakeoffWeight`, `requireAltSingleRunway`, etc.
- **Performance** metrics: `takeoff_field_length`, `landing_distance` (snake_case)
- **Types** array still includes Atlas UUID `id` per type for bookkeeping

Import accepts the same shapes via `npm run db:crew-import` or Data Hub → Fleet & performance → Load POH seed.

## Blocked / later (do not invent data)

- **B300 landing POH** — still calibrated stand-in; replace via AFM upload when transcribed → then `afmStatus: complete`
- **CL35 / LR45 AFM + operating** — wait for Nicolas; keep `afmStatus: missing` until real upload
- **`POST /api/v1/calc/trip`** — Phase B when quotes need it; Crew supplies golden fixtures
- **CG / moment arms** — out of scope until Crew asks

## References

- `data/seeds/atlas_initial_data.json` — POH takeoff + calibrated landing (from Crew)
- `data/seeds/crew-sync-sample.json` — example `/sync` response for Swift parser validation
- `data/seeds/crew-airports-sample.json` — example `/airports` response (KSEZ, KPHX, KSDL)
- `data/seeds/crew-airports-full.json` — full `/airports` catalog for slope validation
- `data/seeds/crew-airports-az-check.json` — 24-airport AZ + KSMO/KSDL validation subset
