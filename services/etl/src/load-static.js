// One-off / weekly loader for slow-changing reference data.
// Usage: node --env-file=../../.env src/load-static.js --gtfs ./data/metro-gtfs --gazetteer ./data/2023_Gaz_zcta_national.txt
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createDb, chunkByBytes } from './db.js';
import { loadGtfs, parseGazetteer } from './gtfs.js';
import { HARRIS_ZCTAS } from './acs.js';

const { values } = parseArgs({ options: { gtfs: { type: 'string' }, gazetteer: { type: 'string' } } });
const db = await createDb();

async function upsertChunks(fn, rows) {
  for (const chunk of chunkByBytes(rows)) await db.query(`select ${fn}(:payload::jsonb) as n`, { payload: chunk });
}

if (values.gtfs) {
  const stops = await loadGtfs(values.gtfs);
  await upsertChunks('upsert_transit_stops', stops);
  console.log(`transit_stops: ${stops.length}`);
}
if (values.gazetteer) {
  const rows = parseGazetteer(readFileSync(values.gazetteer, 'utf8'))
    .filter((r) => HARRIS_ZCTAS.has(r.zcta));
  await upsertChunks('upsert_zcta_centroids', rows);
  console.log(`zcta centroids: ${rows.length}`);
}
await db.end();
