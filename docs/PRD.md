# Cuida HOU — Product Requirements (v0.1, 2026-09-26)

Owner: Danny Arzu · Context: Impact Hub Houston hackathon 2026 · SDGs 5, 8, 10, 11

## Problem

- Greater Houston has **44 childcare-desert ZIP codes, 28 chronic** (Children at Risk, Apr 2026). A desert has more than 3 young children of working parents per licensed seat.
- In Houston, **60.4% of women 16+** are in the labor force vs **67.0% of all residents** (Census QuickFacts, ACS 2019–2023).
- Houston is **44.2% Hispanic and 22.3% Black** (ACS-derived; confirm on QuickFacts).
- The state already runs a search portal with open seats. What's missing: planning around a parent's commute and hours, **growing supply inside desert ZIPs**, and a clear bilingual path to becoming a licensed home provider.

> Framing note: the ~30,000-family subsidy waitlist (Apr 2025) is limited by **funding**, not seats. Don't claim new providers shorten it. Use it as evidence of unmet demand only.

## Goals

1. A parent in a desert ZIP finds licensed care matching age, hours and commute in under 2 minutes, in English or Spanish.
2. A woman in a desert ZIP learns whether she could open a home daycare and gets a correct, current, bilingual step list plus a partner handoff.
3. The City and partners see unmet need by ZIP from checkable public data.

## Non-goals

Booking or payments · rating or recommending providers · processing subsidy applications · collecting data about children · any NextPlay Nexus integration.

## Users

| User | Needs | Constraints |
|---|---|---|
| Working parent (e.g., bus rider, early shift) | Care open by 6 a.m., near her route, accepts subsidy | Phone only, limited data, prefers Spanish, no accounts |
| Would-be provider | Eligibility, cost, time, who helps | Deed restrictions, background-check costs, English-only forms |
| Partner navigator | Leads by ZIP, referral tracking | Own case systems, privacy rules |
| City / funder staff | Need by ZIP, seats added | Numbers they can defend |

## Requirements

| ID | Requirement | Priority | Status in repo |
|---|---|---|---|
| F1 | Search by ZIP, age, opens-by time, subsidy | P0 | ✅ `search_providers()` + `/[locale]` |
| F2 | Full EN/ES parity, Spanish default | P0 | ✅ UI strings; Spanish needs native review |
| F3 | Nearest METRO routes per result | P0 | ✅ via `transit_stops` (load GTFS) |
| F4 | State inspection summary + official link | P0 | ✅ counts shown; confirm deep-link format |
| F5 | Need map by ZIP with method shown | P0 | ✅ `/[locale]/need` (ranked table with desert bars) |
| F6 | Provider eligibility quiz + deed-restriction warning | P0 | ✅ `/[locale]/provider-path` quiz, tested |
| F7 | Bilingual, source-linked licensing checklist | P0 | ◐ listed, registered and licensed-home paths; 9 of 12 steps verified |
| F8 | Consent-based provider interest form | P1 | Schema only (`provider_leads`) |
| F9 | Open-seat data (TWC / partner / self-report) | P1 | Schema only (`seat_reports`) |
| F10 | SMS / WhatsApp search | P1 | — |
| F11 | Public impact dashboard | P1 | — |
| F12 | Partner console | P2 | — |
| F13 | More languages by ACS demand | P2 | — |

Design principles: mobile first, works on slow connections, no login to search, ~6th-grade reading level, WCAG 2.1 AA, every number shows its source and age.

## Success metrics

| Stage | Metric | Target |
|---|---|---|
| Hackathon | Live demo on Harris County data, both languages, both doors | Sunday |
| Validation (Oct) | Interviews in 2–3 desert ZIPs | Team to set (suggest 20+) |
| Pilot, leading | Searches, calls tapped, quiz completions, consented handoffs | Set with partner |
| Pilot, lagging | Home permits issued in target ZIPs, seats added | Set with partner (expect lag past a 3-month pilot) |
