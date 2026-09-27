// US Census Geocoder batch API: up to 10,000 addresses per file, returns coordinates plus tract and block.
// Docs: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
const ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/geographies/addressbatch';
export const MAX_BATCH = 10000;

const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

// Input format: Unique ID, Street address, City, State, ZIP
export function toBatchCsv(providers) {
  return providers
    .map((p) => [p.operation_id, q(p.address_line), q(p.city ?? 'Houston'), 'TX', p.zip5 ?? ''].join(','))
    .join('\n');
}

// Minimal RFC 4180 line parser (handles quoted commas).
export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Output columns (geographies return type): ID, Input Address, Match, Match Type, Matched Address,
// Coordinates "lon,lat", TIGER Line ID, Side, State FIPS, County FIPS, Tract, Block
export function parseBatchResult(text) {
  const results = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const f = parseCsvLine(line);
    const [id, , match, matchType, , coords, , , state, county, tract, block] = f;
    if (match !== 'Match' || !coords) {
      results.set(id, { matched: false });
      continue;
    }
    const [lng, lat] = coords.split(',').map(Number);
    results.set(id, {
      matched: true,
      exact: matchType === 'Exact',
      lat, lng,
      tract_geoid: state && county && tract ? `${state}${county}${tract}` : null,
      block: block || null,
    });
  }
  return results;
}

export async function geocodeBatch(providers, { fetchImpl = fetch } = {}) {
  if (providers.length > MAX_BATCH) throw new Error(`Batch too large: ${providers.length} > ${MAX_BATCH}`);
  const form = new FormData();
  form.append('addressFile', new Blob([toBatchCsv(providers)], { type: 'text/csv' }), 'addresses.csv');
  form.append('benchmark', 'Public_AR_Current');
  form.append('vintage', 'Current_Current');
  const res = await fetchImpl(ENDPOINT, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Census geocoder ${res.status}`);
  return parseBatchResult(await res.text());
}
