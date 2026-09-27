# Hackathon plan

**Submission deadline: Sunday 9/27/2026, 11:45 a.m. Central.** Own challenges are accepted. Contact: nextplaynexus@gmail.com.

## Original 48-hour plan (hours from kickoff)

| Hours | Work | Done when |
|---|---|---|
| 0–3 | AWS stack deploy (`infra/README.md`), `npm run db:seed`, keys in Secrets Manager, pipeline dry run | Row count matches the portal for Harris County |
| 3–7 | `etl:sync` (geocode), load GTFS + Gazetteer | ≥90% exact geocodes; unmatched rows listed |
| 7–10 | Review `zcta_need` desert list vs Children at Risk | Differences explained |
| 10–18 | Door 1 polish: map or list view, results UX, Spanish review | Persona 1 finds a 6 a.m. option near her bus, in Spanish |
| 18–26 | Door 2: eligibility quiz, verify remaining pathway steps | Every step has a source; verified dates honest |
| 26–32 | Need page (F5), accessibility + slow-network pass | Lighthouse a11y ≥90; usable on throttled 3G |
| 32–40 | Amplify app + compute role, billing alarm, README | Public URL works on a phone |
| 40–48 | Fix pitch slide 4, rehearse, record backup video, submit | Submitted |

Cut line: need page → table only; Door 2 → registered-home path only.

## Remaining steps before 11:45 a.m. Sunday

| When | Who | Step |
|---|---|---|
| Tonight | Danny | Budgets alert; deploy the stack (infra/README.md steps 1–5); put keys in `cuida-hou/app-keys` |
| Tonight | Danny | Run the pipeline dry run, then the real run; load METRO stops + ZIP centroids |
| Tonight | Danny | Spanish review of `apps/web/messages/es.json` and `db/seed.sql` |
| Morning | Danny | Amplify app + compute role; set `MinCapacity=0.5`; check `/es`, `/es/need`, `/es/provider-path` on a phone |
| Morning | Danny | Fill deck placeholders (team, budget, targets), record a 2-minute backup demo video |
| 11:45 a.m. | Danny | Submit deck link + GitHub repo + live URL |
