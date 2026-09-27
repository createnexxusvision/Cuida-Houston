# Backlog

Suggested GitHub issues. Labels: `blocker`, `P0`, `P1`, `P2`, `data`, `content`, `infra`.

## Blockers (resolve before or during the hackathon)
- [x] **B1** Own challenges accepted; deadline 9/27 11:45 a.m. CT (code ownership still to confirm)
- [ ] **B2** Request TWC / Workforce Solutions Gulf Coast vacancy data access `blocker` `data`
- [ ] **B3** Identify a provider-support partner for Door 2 handoff `blocker`
- [ ] **B5** Legal review of disclaimers, privacy policy, pathway content `blocker` `content`
- [ ] **B6** Name pilot coordinator and Spanish reviewer `blocker`

## P0 (hackathon)
- [ ] Run first live `etl:sync`; record row counts and geocode match rate `data`
- [x] Replace `HARRIS_PREFIXES` with a county–ZCTA crosswalk `data`
- [x] Verify ACS variable IDs for the chosen year `data` (2023 and 2024 5-year, verified 2026-09-26)
- [ ] Load METRO GTFS and Gazetteer centroids `data`
- [x] Need page (F5) with method and ACS vintage `P0` (`/[locale]/need`)
- [x] Eligibility quiz (F6) `P0` (`/[locale]/provider-path`, based on Texas HRC §42.002 and §42.052)
- [ ] Verify remaining pathway steps: registered 4 and 5, listed 3 (HHSC pages blocked from build env; 9 of 12 verified) `content`
- [ ] Native-speaker review of all Spanish strings and seed content `content`
- [ ] Confirm HHSC public-record deep link for each operation `P0`
- [ ] Deploy stack (Aurora + Lambda) and Amplify with compute role; AWS Budgets alarm `infra`
- [x] Fix pitch deck slide 4 (waitlist framing)

## P1 (pilot)
- [ ] Provider interest form with consent + encryption (F8)
- [ ] Seat reports with 14-day expiry (F9)
- [ ] SMS / WhatsApp search (F10)
- [ ] Public impact dashboard (F11)
- [ ] Decide Aurora `MinCapacity` for the pilot (0 = pause when idle, 0.5 = always warm)

## P2
- [ ] Partner console (F12)
- [ ] Additional languages chosen by ACS data (F13)
