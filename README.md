# Cuida HOU

**Una red de cuidado infantil para Houston · A bilingual childcare network for Houston**

Cuida HOU has two doors:

1. **For families:** find state-licensed childcare by ZIP, child's age, opening time and subsidy acceptance, with nearby METRO bus routes and the state inspection summary. English and Spanish.
2. **For would-be providers:** a bilingual, source-linked step list for opening a licensed or registered home daycare in Houston's childcare-desert ZIP codes, with a handoff to support partners (pilot).

Built for the Impact Hub Houston hackathon, Sept 2026. Targets UN SDGs 5, 8, 10 and 11.

> **Status:** hackathon prototype. Listings use live public data. Pathway content is a draft: steps marked "not yet verified" and all Spanish text need review before public launch. See [docs/RISKS.md](docs/RISKS.md).

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 15 (App Router, TypeScript), locale routes `/es` and `/en` |
| Hosting | AWS Amplify Hosting (`amplify.yml`) |
| Data pipeline | Node 22 on AWS Lambda, nightly via EventBridge Scheduler (`infra/template.yaml`) |
| Database | Supabase Postgres + PostGIS (`supabase/migrations/`) |
| Secrets | AWS Secrets Manager |

```
apps/web/            Next.js app (search, provider pathway, /api/providers)
services/etl/        Data pipeline: HHSC licensing -> clean -> geocode -> Census ACS -> need score
supabase/            SQL migration (schema, RLS, search function) and pathway seed content
infra/               AWS SAM template for the Lambda pipeline + setup guide
docs/                PRD, TRD, risk register, data sources, hackathon plan, backlog, pitch deck
```

## Quick start (VS Code terminal, WSL Ubuntu, Node 22)

```bash
git clone <this repo> && cd cuida-hou
nvm use                      # Node 22
npm install
cp .env.example .env         # fill in keys (see below)

# Database: local Supabase stack (requires Docker) or a hosted Supabase project
npx supabase init            # first time only: creates supabase/config.toml, keeps existing migrations
npx supabase start           # or create a project at supabase.com
npx supabase db reset        # applies supabase/migrations + supabase/seed.sql

npm test                     # pipeline + quiz unit tests (no network)
npm run etl:dry-run          # pulls live HHSC + Census data, prints the need ranking, writes nothing
npm run etl:sync             # writes providers + zcta_need to the database
npm run dev                  # http://localhost:3000 -> redirects to /es or /en
```

Free keys you need: a [Census API key](https://api.census.gov/data/key_signup.html) and a [data.texas.gov app token](https://data.texas.gov) (optional but avoids throttling).

Reference data (METRO bus stops, ZCTA centroids for ZIP search) loads separately:

```bash
cd services/etl
node --env-file=../../.env src/load-static.js --gtfs ./data/metro-gtfs --gazetteer ./data/2023_Gaz_zcta_national.txt
```

## Data sources

| Source | Use | License / access |
|---|---|---|
| Texas HHSC Child Care Licensing, [data.texas.gov `bc5r-88dy`](https://data.texas.gov/See-Category-Tile/HHSC-CCL-Daycare-and-Residential-Operations-Data/bc5r-88dy) | Every licensed operation | CC0, Socrata API |
| [Census ACS 5-year API](https://www.census.gov/data/developers.html) | Children under 6 with working parents, Hispanic and Black (incl. Afro-Latino) residents | Public, free key |
| [Census Geocoder](https://geocoding.geo.census.gov/geocoder/) | Address -> point + tract | Public, batch of 10,000 |
| METRO GTFS ([Transitland mirror](https://www.transit.land/feeds/f-9vk-metropolitantransitauthorityofharriscounty)) | Bus stops and routes | Check license terms |

Full details and known gaps: [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Privacy choices

- Home daycares are shown at an approximate location (~500 m) without a street address, even though the state publishes it.
- Search needs no account and collects nothing about children.
- The public API key can only call `search_providers()` and read reference tables. Row-level security blocks direct reads of `providers` and all writes.

## Documents

- [PRD](docs/PRD.md) · [TRD](docs/TRD.md) · [Risk register](docs/RISKS.md) · [Hackathon plan](docs/HACKATHON_PLAN.md) · [Backlog](docs/BACKLOG.md)
- Designed versions: [build plan](docs/build-plan.html), [pitch deck](docs/pitch-deck.html) (open in a browser)

## License

Not chosen yet. Confirm the hackathon's code-ownership rules first (see risk B1), then add a LICENSE file.
