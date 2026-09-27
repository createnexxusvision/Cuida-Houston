// Pulls active day-care operations for one county from the Texas Open Data Portal (Socrata SODA API).
// Dataset: HHSC CCL Daycare and Residential Operations Data, id bc5r-88dy, CC0 license.
import { DAYCARE_TYPES } from './clean.js';

const BASE = 'https://data.texas.gov/resource/bc5r-88dy.json';

export function buildQuery({ county = 'HARRIS', limit = 1000, offset = 0 } = {}) {
  const types = DAYCARE_TYPES.map((t) => `'${t.replace(/'/g, "''")}'`).join(',');
  const where = `county='${county}' AND operation_status='Y' AND operation_type in(${types})`;
  const params = new URLSearchParams({
    $where: where,
    $order: 'operation_id',
    $limit: String(limit),
    $offset: String(offset),
  });
  return `${BASE}?${params}`;
}

export async function fetchAllOperations({ county = 'HARRIS', appToken, pageSize = 1000, fetchImpl = fetch } = {}) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const res = await fetchImpl(buildQuery({ county, limit: pageSize, offset }), {
      headers: appToken ? { 'X-App-Token': appToken } : {},
    });
    if (!res.ok) throw new Error(`HHSC API ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
