// American Community Survey 5-year estimates by ZIP Code Tabulation Area (ZCTA).
// Variable IDs verified 2026-09-26 against api.census.gov for ACS 2023 and 2024 5-year.
import { readFileSync } from 'node:fs';

const YEAR = process.env.ACS_YEAR ?? '2024';

// B23008: own children under 6 by living arrangement and parents' employment status.
//   _004 living with two parents, both in labor force
//   _010 living with father only, father in labor force
//   _013 living with mother only, mother in labor force
// B03002: Hispanic or Latino origin by race.
//   _001 total, _012 Hispanic or Latino total, _014 Hispanic or Latino: Black alone, _004 not Hispanic: Black alone
export const VARS = {
  u6_both_working: 'B23008_004E',
  u6_father_working: 'B23008_010E',
  u6_mother_working: 'B23008_013E',
  u6_total: 'B23008_002E',
  pop_total: 'B03002_001E',
  hispanic: 'B03002_012E',
  black_hispanic: 'B03002_014E',
  black_hispanic_moe: 'B03002_014M',
  black_non_hispanic: 'B03002_004E',
};

// Every ZCTA that overlaps Harris County, from the Census 2020 ZCTA-to-county relationship file.
// Regenerate with scripts/build-zcta-list.md if the county changes.
const crosswalk = JSON.parse(readFileSync(new URL('./data/harris-zctas.json', import.meta.url), 'utf8'));
export const HARRIS_ZCTAS = new Set(crosswalk.zctas);
export const MULTI_COUNTY_ZCTAS = new Set(crosswalk.also_in_other_counties);

export async function fetchAcsByZcta({ key, fetchImpl = fetch, zctas = HARRIS_ZCTAS } = {}) {
  if (!key) throw new Error('CENSUS_API_KEY is required: the Census API rejects requests without a key (free at https://api.census.gov/data/key_signup.html)');
  const get = ['NAME', ...Object.values(VARS)].join(',');
  const url = `https://api.census.gov/data/${YEAR}/acs/acs5?get=${get}&for=zip%20code%20tabulation%20area:*&key=${encodeURIComponent(key)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`ACS API ${res.status}`);
  const [header, ...rows] = await res.json();
  return rowsToZcta(header, rows, zctas);
}

export function rowsToZcta(header, rows, zctas = HARRIS_ZCTAS) {
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const n = (r, v) => {
    const x = Number(r[idx[v]]);
    return Number.isFinite(x) && x >= 0 ? x : null; // Census uses negative sentinels for missing values
  };
  const out = new Map();
  for (const r of rows) {
    const zcta = r[idx['zip code tabulation area']];
    if (!zctas.has(zcta)) continue;
    out.set(zcta, {
      zcta,
      children_u6_working: (n(r, VARS.u6_both_working) ?? 0) + (n(r, VARS.u6_father_working) ?? 0) + (n(r, VARS.u6_mother_working) ?? 0),
      children_u6_total: n(r, VARS.u6_total),
      pop_total: n(r, VARS.pop_total),
      hispanic: n(r, VARS.hispanic),
      black_hispanic: n(r, VARS.black_hispanic),
      black_hispanic_moe: n(r, VARS.black_hispanic_moe),
      black_non_hispanic: n(r, VARS.black_non_hispanic),
      multi_county: MULTI_COUNTY_ZCTAS.has(zcta),
      acs_vintage: `ACS ${YEAR} 5-year`,
    });
  }
  return out;
}
