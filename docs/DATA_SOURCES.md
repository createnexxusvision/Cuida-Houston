# Data sources (checked 2026-09-26)

| Source | What we checked | Finding | Confidence |
|---|---|---|---|
| HHSC CCL operations, `bc5r-88dy` | Schema + live rows | CC0. Has type, address, ZIP, capacity, ages, subsidy flag, hours, days, deficiency counts, status. **No lat/lng.** Last row update 2026-09-15 | High |
| Same, home rows | Live rows | Registered homes list the provider's personal name and home address → approximate display | High |
| TWC Child Care Data & Reports | Page review | Provider-level monthly subsidy report (TRS level, capacity) downloadable; page lists a July 2024 file. **No vacancy download** | Medium |
| TWC Child Care Availability Portal | Search | Shows open seats by age; **no public API found** → needs a data agreement | High |
| Children at Risk desert map | Page review | Interactive only; no download/terms. We recompute with the same 3:1 definition | High |
| Census Geocoder | API docs | Batch ≤10,000, returns tract/block | High |
| Census ACS | api.census.gov variable metadata | B23008_002/004/010/013 and B03002_001/004/012/014 labels verified for 2023 and 2024 5-year. API key required on every request. Show margins of error (Afro-Latino counts by ZIP are noisy) | High |
| Census 2020 ZCTA–County relationship file | Via zctaCrosswalk package (census.gov blocked from build env) | 143 ZCTAs overlap Harris County; 22 also in another county. Regenerate with `scripts/build-zcta-list.md` | High (confirm with official file) |
| METRO GTFS | Transitland | Static feed mirrored; METRO API portal uses subscription keys. Check license | Medium-high |
| Census Gazetteer (ZCTA centroids) | — | Verify current file URL | Medium |

## Not yet verified
- Texas SB 599 (89th session) passage and scope
- HHSC provider application steps (page returned 403 to automated fetch; transcribe by hand)
- Startup costs for home providers (background checks, training)
- Whether the TWC portal is fully in Spanish
- Deep-link format for an operation's public HHSC inspection record
