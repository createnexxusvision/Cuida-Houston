# Data sources (checked 2026-09-26)

| Source | What we checked | Finding | Confidence |
|---|---|---|---|
| HHSC CCL operations, `bc5r-88dy` | Schema + live rows | CC0. Has type, address, ZIP, capacity, ages, subsidy flag, hours, days, deficiency counts, status. **No lat/lng.** Last row update 2026-09-15 | High |
| Same, home rows | Live rows | Registered homes list the provider's personal name and home address → approximate display | High |
| TWC Child Care Data & Reports | Page review | Provider-level monthly subsidy report (TRS level, capacity) downloadable; page lists a July 2024 file. **No vacancy download** | Medium |
| TWC Child Care Availability Portal | Search | Shows open seats by age; **no public API found** → needs a data agreement | High |
| Children at Risk desert map | Page review | Interactive only; no download/terms. We recompute with the same 3:1 definition | High |
| Census Geocoder | API docs | Batch ≤10,000, returns tract/block | High |
| Census ACS | Variable choice | B23008, B03002, C16001 by ZCTA. Verify IDs per year; show margins of error (Afro-Latino counts by ZIP are noisy) | Medium-high |
| METRO GTFS | Transitland | Static feed mirrored; METRO API portal uses subscription keys. Check license | Medium-high |
| Census Gazetteer (ZCTA centroids) | — | Verify current file URL | Medium |

## Not yet verified
- Texas SB 599 (89th session) passage and scope
- HHSC provider application steps (page returned 403 to automated fetch; transcribe by hand)
- Startup costs for home providers (background checks, training)
- Whether the TWC portal is fully in Spanish
- Deep-link format for an operation's public HHSC inspection record
