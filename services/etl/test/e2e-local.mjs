// End-to-end check against a local Postgres + PostGIS (not part of `npm test`; needs a database).
//   OWNER_DATABASE_URL=postgres://postgres:pw@localhost:5432/cuida \
//   WEB_DATABASE_URL=postgres://cuida_web:pw@localhost:5432/cuida node test/e2e-local.mjs
// Loads fixture data through the pipeline's write functions, then proves the web role can search and read
// reference tables but cannot read raw provider rows or write anything.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDb, chunkByBytes } from '../src/db.js';
import { cleanRows, approxPoint } from '../src/clean.js';
import { computeNeed, capacityByZip } from '../src/need.js';

const owner = await createDb({ DATABASE_URL: process.env.OWNER_DATABASE_URL });
const raw = JSON.parse(readFileSync(new URL('./fixtures/hhsc-sample.json', import.meta.url)));
const geo = { '915992': [29.7011, -95.36], '366504': [29.7123, -95.3712] };
const rows = cleanRows(raw).map((p) => {
  const [lat, lng] = geo[p.operation_id];
  const pub = p.is_home ? approxPoint(lat, lng) : { lat, lng };
  return { ...p, zip5: '77021', lat, lng, public_lat: pub.lat, public_lng: pub.lng, location_precision: p.is_home ? 'approx' : 'exact' };
});
for (const c of chunkByBytes(rows)) await owner.query('select upsert_providers(:payload::jsonb) as n', { payload: c });
const acs = new Map([
  ['77021', { zcta: '77021', children_u6_working: 600, pop_total: 30000, hispanic: 9000, black_hispanic: 300, black_hispanic_moe: 150, black_non_hispanic: 18000, multi_county: false, acs_vintage: 'SAMPLE' }],
  ['77093', { zcta: '77093', children_u6_working: 2100, pop_total: 40000, hispanic: 31000, black_hispanic: 220, black_hispanic_moe: 140, black_non_hispanic: 5800, multi_county: false, acs_vintage: 'SAMPLE' }],
]);
await owner.query('select upsert_zcta_need(:payload::jsonb) as n', { payload: computeNeed(capacityByZip(rows), acs) });
await owner.query('select upsert_zcta_centroids(:payload::jsonb) as n', { payload: [{ zcta: '77021', centroid_lat: 29.7, centroid_lng: -95.36 }] });
await owner.query('select upsert_transit_stops(:payload::jsonb) as n', { payload: [{ stop_id: 's1', name: 'Stop', lat: 29.7012, lng: -95.3601, routes: ['80', '5'] }] });
await owner.end();

const web = await createDb({ DATABASE_URL: process.env.WEB_DATABASE_URL });
const denied = async (sql) => assert.rejects(() => web.query(sql), /permission denied/, sql);
await denied('select * from providers');
await denied("select upsert_providers('[]'::jsonb)");
await denied("insert into zcta_need(zcta) values ('99999')");
await denied('select * from provider_leads');
assert.equal((await web.query('select zcta from zcta_need')).length, 2);
assert.ok((await web.query('select id from pathway_steps')).length >= 12);

const res = (await web.query(
  `select to_jsonb(r)::text as j from search_providers(p_zip => :zip::char(5), p_age => :age, p_subsidy => :subsidy,
     p_opens_by => :opens_by::time, p_day => :day, p_limit => 50) r`,
  { zip: '77021', age: 'Toddler', subsidy: null, opens_by: null, day: null },
)).map((r) => JSON.parse(r.j));
assert.equal(res.length, 2);
const center = res.find((r) => !r.is_home);
const home = res.find((r) => r.is_home);
assert.equal(center.distance_m, 122);
assert.deepEqual(center.nearby_routes, ['5', '80']);
assert.equal(home.address_line, null, 'home address must never reach the web');
assert.equal(home.lat, 29.71, 'home location must be rounded');
await web.end();
console.log('e2e-local: all checks passed');
