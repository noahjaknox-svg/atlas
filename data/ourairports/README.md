# OurAirports reference data

Public-domain airport reference from [OurAirports open data](https://ourairports.com/data/), stored ICAO-keyed for Atlas and PrismJet Crew.

## Setup

```bash
npm run db:ourairports-download   # fetch latest CSVs (~15 MB)
npm run db:push                   # apply airport_reference tables
npm run db:ourairports-import      # load into Postgres
```

CSVs are gitignored; re-download anytime to refresh.

## Tables

| Table | Source CSV |
|-------|------------|
| `country_reference` | countries.csv |
| `region_reference` | regions.csv |
| `airport_reference` | airports.csv |
| `airport_runway_reference` | runways.csv |
| `airport_frequency_reference` | airport-frequencies.csv |

`airport_reference.icao` is the four-letter ICAO when available; otherwise lookup uses `ident`.

## APIs

**Atlas (session auth)**

- `GET /api/airports/search?q=KSDL`
- `GET /api/airports/KSDL` — merges OurAirports reference + Atlas pricing/FBOs when present

**PrismJet Crew (Bearer `CREW_API_KEY`)**

- `GET /api/v1/crew/airports/search?q=Scottsdale`
- `GET /api/v1/crew/airports/KSDL`
- `GET /api/v1/crew/sync` — includes `airports[]` for fleet home bases
