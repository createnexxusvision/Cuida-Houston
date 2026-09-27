// One-off / weekly loader for slow-changing reference data.
// Usage: node --env-file=../../.env src/load-static.js --gtfs ./data/metro-gtfs --gazetteer ./data/2023_Gaz_zcta_national.txt
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { loadGtfs, parseGazetteer } from './gtfs.js';
import { HARRIS_ZCTAS } from './acs.js';

const { values } = parseArgs({ options: { gtfs: { type: 'string' }, gazetteer: { type: 'string' } } });
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function upsertChunks(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 1000), { onConflict });
    if (error) throw error;
  }
}

if (values.gtfs) {
  const stops = await loadGtfs(values.gtfs);
  await upsertChunks('transit_stops', stops, 'stop_id');
  console.log(`transit_stops: ${stops.length}`);
}
if (values.gazetteer) {
  const rows = parseGazetteer(readFileSync(values.gazetteer, 'utf8'))
    .filter((r) => HARRIS_ZCTAS.has(r.zcta));
  await upsertChunks('zcta_need', rows, 'zcta');
  console.log(`zcta centroids: ${rows.length}`);
}
