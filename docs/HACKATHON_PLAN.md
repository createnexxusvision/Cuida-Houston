# 48-hour plan (hours from kickoff; submission deadline unconfirmed)

| Hours | Work | Done when |
|---|---|---|
| 0–3 | Supabase project, `db reset`, keys in `.env`, `npm run etl:dry-run` | Row count matches the portal for Harris County |
| 3–7 | `etl:sync` (geocode), load GTFS + Gazetteer | ≥90% exact geocodes; unmatched rows listed |
| 7–10 | Review `zcta_need` desert list vs Children at Risk | Differences explained |
| 10–18 | Door 1 polish: map or list view, results UX, Spanish review | Persona 1 finds a 6 a.m. option near her bus, in Spanish |
| 18–26 | Door 2: eligibility quiz, verify remaining pathway steps | Every step has a source; verified dates honest |
| 26–32 | Need page (F5), accessibility + slow-network pass | Lighthouse a11y ≥90; usable on throttled 3G |
| 32–40 | Deploy: Amplify app + SAM pipeline, billing alarm, README | Public URL works on a phone |
| 40–48 | Fix pitch slide 4, rehearse, record backup video, submit | Submitted |

Cut line: need page → table only; Door 2 → registered-home path only.
