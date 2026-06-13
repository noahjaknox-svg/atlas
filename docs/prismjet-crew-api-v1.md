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

Data Hub → **Performance Data** tab (`/data?tab=performance-data`):

- Manage aircraft types, charter fleet tails, and performance grids
- **Load bundled seed** imports N1213P + B300 sample data
- Per-tail **basic empty weight** and full `operating` block editable in UI

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
| Staging | TBD |
| Production | TBD |

## Deliverables to Crew

1. Staging base URL + read-only API key
2. 2–3 real `/sync` sample responses
3. OpenAPI when stable

## References

- `crew_data_sample.json` — canonical wire format (from Crew team)
- `atlas_initial_data.json` — first-load seed (N1213P + B300 grids)
