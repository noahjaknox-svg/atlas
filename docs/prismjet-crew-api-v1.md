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

Data Hub → **PrismJet Crew Data** (`/data?tab=performance-data`):

Atlas owns the database — add types, grids, and tails here (not by editing Supabase directly).

### Adding a new aircraft type

Create all three so the type flows through `GET /api/v1/crew/sync`:

1. **Aircraft type** — code (e.g. `C25B`), manufacturer, model
2. **Performance grids** for that type — `takeoffFieldLength` and `landingDistance`, each a grid over pressure altitude × weight × OAT (same structure as the King Air B300)
3. **One or more tails** referencing that type, each with its full `operating` block

**In the UI today:**

- Step 1 and 3: create/edit in Data Hub (types table + Add tail dialog)
- Step 2: import from Crew export JSON (bundled seed or **Load bundled seed** / `POST /api/data/crew-import`), or POST grid JSON to `/api/data/crew-performance`

Per-tail **basic empty weight** and full `operating` block are editable in the Add/Edit tail dialog.

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
- `aircraftTypes[]` — type catalog with `updatedAt`
- `fleet[]` — tails with `operating` block and `updatedAt`
- `performance[]` — per-type takeoff + landing grids (`metric`, `unit`, `axes`, `values`, `updatedAt`)

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

Import accepts the same shapes via `npm run db:crew-import` or Data Hub → PrismJet Crew Data → Load bundled seed.

## References

- `data/seeds/atlas_initial_data.json` — POH takeoff + calibrated landing (from Crew)
- `data/seeds/crew-sync-sample.json` — example `/sync` response for Swift parser validation
- `data/seeds/crew-airports-sample.json` — example `/airports` response (KSEZ, KPHX, KSDL)
- `data/seeds/crew-airports-full.json` — full `/airports` catalog for slope validation
- `data/seeds/crew-airports-az-check.json` — 24-airport AZ + KSMO/KSDL validation subset
