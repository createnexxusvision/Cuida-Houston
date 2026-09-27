# Risk register (v0.1)

L = likelihood, I = impact (H/M/L). Status: Confirmed = verified by research; Assumed = not yet checked.

## Project-stopping issues
| ID | Issue | Why it blocks |
|---|---|---|
| B1 | ~~Hackathon rules~~ Own challenges accepted; deadline 9/27 11:45 a.m. CT. Code ownership still unconfirmed | IP terms affect what happens after |
| B2 | No public vacancy API | Parent side shows capacity, not open seats |
| B3 | No support partner | Door 2 becomes a checklist; sign-ups stall |
| B4 | Deed restrictions | Can legally bar a home business after she's invested in licensing |
| B5 | Regulatory accuracy / liability | Wrong guidance or implied endorsement |
| B6 | Team capacity after Sunday | Pilot needs named coordinator + Spanish reviewer |

## Register
| ID | Area | Risk | L/I | Mitigation | Status |
|---|---|---|---|---|---|
| R1 | Event | Own challenge not allowed / IP conflict | M/H | Ask now; fallback framing under a posted challenge | Unknown |
| R2 | Data | No open-seat data | H/H | Label capacity; TWC agreement; self-report at P1 | Confirmed |
| R3 | Data | Geocode misses | M/M | ZIP fallback + precision flag | Confirmed format issues |
| R4 | Data | ZIP vs ZCTA mismatch | M/M | ZCTA for need, ZIP for search; explain | Known |
| R5 | Data | Large margins of error for Afro-Latino counts by ZIP | H/M | Show margins of error; report at larger geographies | Known |
| R6 | Data | Our desert list differs from Children at Risk | M/M | Publish method; invite review | Likely |
| R7 | Data | HHSC schema change / outage | L/M | Schema checks; keep last good snapshot | Assumed |
| R8 | Legal | Pathway guidance wrong or stale | M/H | Source + verified date per step; quarterly check; legal review | Manual |
| R9 | Legal | Deed restrictions | M/H | Step 1 warning; legal clinic referral | Confirmed possible |
| R10 | Legal | Liability for a listed provider | L/H | No endorsements; neutral state data; disclaimers | Assumed |
| R11 | Legal | Privacy obligations for leads | M/M | Minimal data, consent, legal check of Texas law | Unverified |
| R12 | Product | Republishing home addresses | M/H | Approximate location (implemented) | Confirmed |
| R13 | Product | Low trust / adoption | H/H | Churches, clinics, schools, promotoras; SMS | Assumed |
| R14 | Product | Poor Spanish | M/H | Native review; plain-language guide | Assumed |
| R15 | Product | Duplicates TWC portal / partner programs | M/M | Complement: transit, deserts, supply; link to TWC | Check |
| R16 | Supply | Licensing takes months | H/M | Report leading indicators | Likely |
| R17 | Supply | Startup costs deter providers | H/H | Microgrants via partners; show costs early | Costs unverified |
| R18 | Supply | Thin margins; closures | M/H | Subsidy enrollment, TRS, business coaching | Assumed |
| R19 | Supply | Subsidy funding, not seats, limits low-income families | H/M | Don't claim waitlist reduction | Confirmed |
| R20 | Tech | AWS bill after the $100 credit; Aurora left at high capacity | L/M | Auto-pause (`MinCapacity=0`), `MaxCapacity=2`, Budgets alarms at $10/$50, tags | Mitigated |
| R30 | Tech | Aurora resume delay (~15 s) makes the first search after idle look broken | M/M | `MinCapacity=0.5` during demos; 30 s client timeout | Known |
| R31 | Tech | Data API behavior differs from local `pg` driver | M/M | All queries return JSON text; test on AWS before the demo | Untested on AWS |
| R21 | Tech | Slow phones | M/M | Server rendering, list-first, small bundles | Assumed |
| R22 | Team | Teammates leave after Sunday | H/H | Named pilot owners or partner handoff | Likely |
| R23 | Funding | Grant dependence | H/M | Grant plan; low costs | Assumed |
| R24 | Stakeholder | City doesn't regulate childcare (state does) | H/M | Ask City for convening, promotion, data, space | Structural |
| R25 | Stakeholder | City/County programs separate | M/M | Engage both; lead with public data | Assumed |
| R26 | Stakeholder | State slow to share data | H/M | Start in October via Workforce Solutions | Assumed |
| R27 | Stakeholder | Centers see home providers as competition | L/M | Focus on desert ZIPs | Assumed |
| R28 | Policy | Rules change mid-pilot | M/M | Quarterly review; watch Texas Register | Assumed |
| R29 | Tech | Amplify SSR env vars not exposed by default | M/M | Handled in `amplify.yml`; test early | Known |

## Scaling problems
| When it grows to… | What breaks | Plan |
|---|---|---|
| All of Greater Houston | County-line need scores; different partners | Region-wide ZCTA model; partner map per county |
| Hundreds of provider leads | Partner coaching capacity | Cohorts; add partners before marketing |
| Self-reported seats | Stale/false counts | 14-day expiry; operation-ID check; spot calls |
| More languages | Translation/review cost | Pick by ACS demand; version content |
| SMS volume | Per-message cost, carrier registration | Budget; register early; WhatsApp option |
| Other Texas cities | Local partners, transit, deed rules | Config per city; local partner required |
| Other states | Different licensing data and rules | Adapter + content rewrite per state |
| Trusted-source status | Liability, uptime expectations | Governance; fiscal sponsor or nonprofit home |
| Grant cycles end | Tool goes stale | Plan handoff to a long-term host from day one |
