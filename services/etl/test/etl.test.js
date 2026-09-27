import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanRows, parseHours, zip5, approxPoint, cleanAddress } from '../src/clean.js';
import { buildQuery } from '../src/hhsc.js';
import { parseBatchResult, toBatchCsv } from '../src/geocode.js';
import { rowsToZcta } from '../src/acs.js';
import { capacityByZip, computeNeed } from '../src/need.js';

const sample = JSON.parse(readFileSync(new URL('./fixtures/hhsc-sample.json', import.meta.url)));

test('keeps day-care types and drops residential operations', () => {
  const rows = cleanRows(sample);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.operation_id), ['915992', '366504']);
});

test('normalizes fields', () => {
  const [center, home] = cleanRows(sample);
  assert.equal(center.zip5, '77021');
  assert.equal(home.zip5, '77099');
  assert.equal(center.is_home, false);
  assert.equal(home.is_home, true);
  assert.equal(center.capacity, 153);
  assert.deepEqual(center.ages, ['Infant', 'Toddler', 'Pre-Kindergarten', 'School']);
  assert.equal(center.accepts_subsidy, false);
  assert.equal(center.address_line, '5618 H. Mark Crosswell Street Jr');
  assert.equal(home.deficiency_medium_high, 7);
  assert.match(center.row_hash, /^[a-f0-9]{64}$/);
});

test('parses hours', () => {
  assert.deepEqual(parseHours('07:00 AM-08:00 PM'), { open: '07:00', close: '20:00' });
  assert.deepEqual(parseHours('12:00 AM-12:00 PM'), { open: '00:00', close: '12:00' });
  assert.deepEqual(parseHours('-'), { open: null, close: null });
  assert.deepEqual(parseHours(undefined), { open: null, close: null });
});

test('zip and address helpers', () => {
  assert.equal(zip5('77099 4006'), '77099');
  assert.equal(zip5(''), null);
  assert.equal(cleanAddress('10815 NOBILITY DR  HOUSTON TX- 77099 4006'), '10815 NOBILITY DR HOUSTON');
});

test('approximate point rounds to ~500 m grid', () => {
  const p = approxPoint(29.70123, -95.55678);
  assert.equal(p.lat, 29.7);
  assert.equal(p.lng, -95.555);
});

test('HHSC query filters county, status and types', () => {
  const url = decodeURIComponent(buildQuery({ offset: 1000 }).replace(/\+/g, ' '));
  assert.match(url, /county='HARRIS'/);
  assert.match(url, /operation_status='Y'/);
  assert.match(url, /'Registered Child-Care Home'/);
  assert.match(url, /\$offset=1000/);
});

test('geocoder CSV in and out', () => {
  const csv = toBatchCsv([{ operation_id: '1', address_line: '5618 Main St, Apt "B"', city: 'Houston', zip5: '77021' }]);
  assert.equal(csv, '1,"5618 Main St, Apt ""B""","Houston",TX,77021');
  const out = parseBatchResult([
    '"1","5618 MAIN ST, HOUSTON, TX, 77021","Match","Exact","5618 MAIN ST, HOUSTON, TX, 77021","-95.35,29.70","123","L","48","201","312300","1001"',
    '"2","BAD ADDRESS","No_Match"',
  ].join('\n'));
  assert.deepEqual(out.get('1'), { matched: true, exact: true, lat: 29.7, lng: -95.35, tract_geoid: '48201312300', block: '1001' });
  assert.deepEqual(out.get('2'), { matched: false });
});

test('ACS rows to ZCTA and need score', () => {
  const header = ['NAME', 'B23008_004E', 'B23008_010E', 'B23008_013E', 'B23008_002E', 'B03002_001E', 'B03002_012E', 'B03002_014E', 'B03002_014M', 'B03002_004E', 'zip code tabulation area'];
  const rows = [
    ['ZCTA5 77021', '300', '20', '280', '900', '30000', '9000', '300', '150', '18000', '77021'],
    ['ZCTA5 77099', '800', '50', '350', '1500', '50000', '30000', '900', '300', '10000', '77099'],
    ['ZCTA5 10001', '1', '1', '1', '1', '1', '1', '1', '1', '1', '10001'],
  ];
  const acs = rowsToZcta(header, rows);
  assert.equal(acs.size, 2); // 10001 (New York) is dropped by the Harris County crosswalk
  assert.equal(acs.get('77021').children_u6_working, 600);
  const need = computeNeed(capacityByZip(cleanRows(sample)), acs);
  const z21 = need.find((r) => r.zcta === '77021');
  const z99 = need.find((r) => r.zcta === '77099');
  assert.equal(z21.seats_per_100, 25.5); // 153 / 600
  assert.equal(z21.desert, true);
  assert.equal(z99.seats_per_100, 1); // 12 / 1200
  assert.equal(need[0].zcta, '77099'); // worst first
});

import { loadGtfs, parseGazetteer } from '../src/gtfs.js';

test('GTFS stops get the routes that serve them', async () => {
  const stops = await loadGtfs(new URL('./fixtures/gtfs/', import.meta.url).pathname);
  assert.deepEqual(stops, [
    { stop_id: 'S1', name: 'Main @ Elgin', lat: 29.7012, lng: -95.3601, routes: ['5', '80'] },
    { stop_id: 'S2', name: 'Scott St', lat: 29.71, lng: -95.35, routes: ['5'] },
  ]);
});

test('Gazetteer ZCTA centroids', () => {
  const rows = parseGazetteer('GEOID\tALAND\tAWATER\tALAND_SQMI\tAWATER_SQMI\tINTPTLAT\tINTPTLONG                  \n77021\t1\t1\t1\t1\t29.695\t-95.356\n');
  assert.deepEqual(rows, [{ zcta: '77021', centroid_lat: 29.695, centroid_lng: -95.356 }]);
});

import { HARRIS_ZCTAS, MULTI_COUNTY_ZCTAS, fetchAcsByZcta } from '../src/acs.js';

test('Harris County ZCTA crosswalk', () => {
  assert.equal(HARRIS_ZCTAS.size, 143);
  assert.ok(HARRIS_ZCTAS.has('77204')); // UH campus, missed by the old prefix filter
  assert.ok(!HARRIS_ZCTAS.has('77469')); // Richmond, Fort Bend County
  assert.ok(MULTI_COUNTY_ZCTAS.size > 0 && [...MULTI_COUNTY_ZCTAS].every((z) => HARRIS_ZCTAS.has(z)));
});

test('ACS fetch refuses to run without a key', async () => {
  await assert.rejects(() => fetchAcsByZcta({ key: undefined }), /CENSUS_API_KEY is required/);
});
