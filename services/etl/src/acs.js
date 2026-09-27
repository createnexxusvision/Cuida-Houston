// American Community Survey 5-year estimates by ZIP Code Tabulation Area (ZCTA).
// VERIFY variable IDs against https://api.census.gov/data/{year}/acs/acs5/variables.json before relying on output.
const YEAR = process.env.ACS_YEAR ?? '2023';

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

// Rough Harris County ZCTA filter by prefix. Replace with a proper county-ZCTA crosswalk (see docs/DATA_SOURCES.md).
export const HARRIS_PREFIXES = ['770', '773', '774', '775'];

export async function fetchAcsByZcta({ key, fetchImpl = fetch, prefixes = HARRIS_PREFIXES } = {}) {
  const get = ['NAME', ...Object.values(VARS)].join(',');
  const url = `https://api.census.gov/data/${YEAR}/acs/acs5?get=${get}&for=zip%20code%20tabulation%20area:*${key ? `&key=${key}` : ''}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`ACS API ${res.status}`);
  const [header, ...rows] = await res.json();
  return rowsToZcta(header, rows, prefixes);
}

export function rowsToZcta(header, rows, prefixes = HARRIS_PREFIXES) {
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const n = (r, v) => {
    const x = Number(r[idx[v]]);
    return Number.isFinite(x) && x >= 0 ? x : null; // Census uses negative sentinels for missing values
  };
  const out = new Map();
  for (const r of rows) {
    const zcta = r[idx['zip code tabulation area']];
    if (!prefixes.some((p) => zcta.startsWith(p))) continue;
    out.set(zcta, {
      zcta,
      children_u6_working: (n(r, VARS.u6_both_working) ?? 0) + (n(r, VARS.u6_father_working) ?? 0) + (n(r, VARS.u6_mother_working) ?? 0),
      children_u6_total: n(r, VARS.u6_total),
      pop_total: n(r, VARS.pop_total),
      hispanic: n(r, VARS.hispanic),
      black_hispanic: n(r, VARS.black_hispanic),
      black_hispanic_moe: n(r, VARS.black_hispanic_moe),
      black_non_hispanic: n(r, VARS.black_non_hispanic),
      acs_vintage: `ACS ${YEAR} 5-year`,
    });
  }
  return out;
}
