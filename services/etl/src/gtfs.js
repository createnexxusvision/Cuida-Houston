// Loads METRO Houston static GTFS (stops + routes serving each stop) into `transit_stops`.
// Source: METRO's GTFS feed, mirrored on Transitland (feed f-9vk-metropolitantransitauthorityofharriscounty).
// Unzip the feed first; pass the directory. stop_times.txt is large, so it is streamed.
import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseCsvLine } from './geocode.js';

export function parseCsv(text) {
  const [head, ...lines] = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const cols = parseCsvLine(head);
  return lines.map((l) => Object.fromEntries(parseCsvLine(l).map((v, i) => [cols[i], v])));
}

async function* streamCsv(path) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let cols;
  for await (const line of rl) {
    if (!line) continue;
    const f = parseCsvLine(line.replace(/^﻿/, ''));
    if (!cols) { cols = f; continue; }
    yield Object.fromEntries(f.map((v, i) => [cols[i], v]));
  }
}

export async function loadGtfs(dir) {
  const routes = new Map(parseCsv(readFileSync(join(dir, 'routes.txt'), 'utf8'))
    .map((r) => [r.route_id, r.route_short_name || r.route_long_name || r.route_id]));
  const tripRoute = new Map(parseCsv(readFileSync(join(dir, 'trips.txt'), 'utf8')).map((t) => [t.trip_id, t.route_id]));
  const stopRoutes = new Map();
  for await (const st of streamCsv(join(dir, 'stop_times.txt'))) {
    const route = routes.get(tripRoute.get(st.trip_id));
    if (!route) continue;
    if (!stopRoutes.has(st.stop_id)) stopRoutes.set(st.stop_id, new Set());
    stopRoutes.get(st.stop_id).add(route);
  }
  return parseCsv(readFileSync(join(dir, 'stops.txt'), 'utf8'))
    .filter((s) => (s.location_type ?? '0') === '0' || s.location_type === '')
    .map((s) => ({
      stop_id: s.stop_id,
      name: s.stop_name,
      lat: Number(s.stop_lat),
      lng: Number(s.stop_lon),
      routes: [...(stopRoutes.get(s.stop_id) ?? [])].sort(),
    }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

// Census Gazetteer ZCTA file (tab-separated) -> centroids used for ZIP search.
// VERIFY the current file URL at https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
export function parseGazetteer(text) {
  const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const cols = head.split('\t').map((c) => c.trim());
  const iz = cols.indexOf('GEOID'), ilat = cols.indexOf('INTPTLAT'), ilng = cols.indexOf('INTPTLONG');
  return lines.map((l) => l.split('\t')).map((f) => ({ zcta: f[iz].trim(), centroid_lat: Number(f[ilat]), centroid_lng: Number(f[ilng]) }));
}
