// AWS Lambda entry point. Triggered nightly by EventBridge Scheduler (see infra/template.yaml).
// Steps: fetch HHSC rows -> clean -> geocode new/changed rows -> upsert providers -> recompute ZCTA need.
import { createClient } from '@supabase/supabase-js';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { fetchAllOperations } from './hhsc.js';
import { cleanRows, approxPoint } from './clean.js';
import { geocodeBatch, MAX_BATCH } from './geocode.js';
import { fetchAcsByZcta } from './acs.js';
import { capacityByZip, computeNeed } from './need.js';

async function loadSecrets() {
  if (!process.env.SECRET_ARN) return process.env; // local dev: read from .env
  const sm = new SecretsManagerClient({});
  const out = await sm.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }));
  return { ...process.env, ...JSON.parse(out.SecretString) };
}

export async function run({ dryRun = false } = {}) {
  const env = await loadSecrets();
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const raw = await fetchAllOperations({ county: env.COUNTY ?? 'HARRIS', appToken: env.SOCRATA_APP_TOKEN });
  const providers = cleanRows(raw);
  console.log(JSON.stringify({ step: 'fetch', raw: raw.length, kept: providers.length }));

  // Only geocode rows that are new or changed since the last run.
  const { data: existing, error: exErr } = await db.from('providers').select('operation_id,row_hash');
  if (exErr) throw exErr;
  const known = new Map((existing ?? []).map((r) => [r.operation_id, r.row_hash]));
  const changed = providers.filter((p) => known.get(p.operation_id) !== p.row_hash);

  const geo = new Map();
  for (let i = 0; i < changed.length; i += MAX_BATCH) {
    const res = await geocodeBatch(changed.slice(i, i + MAX_BATCH));
    for (const [k, v] of res) geo.set(k, v);
  }

  const rows = changed.map((p) => {
    const g = geo.get(p.operation_id);
    const pub = g?.matched && p.is_home ? approxPoint(g.lat, g.lng) : { lat: g?.lat ?? null, lng: g?.lng ?? null };
    return {
      ...p,
      lat: g?.matched ? g.lat : null,
      lng: g?.matched ? g.lng : null,
      public_lat: g?.matched ? pub.lat : null,
      public_lng: g?.matched ? pub.lng : null,
      location_precision: !g?.matched ? 'zip' : p.is_home ? 'approx' : 'exact',
      tract_geoid: g?.tract_geoid ?? null,
      synced_at: new Date().toISOString(),
    };
  });
  console.log(JSON.stringify({ step: 'geocode', changed: changed.length, matched: [...geo.values()].filter((g) => g.matched).length }));

  // Operations that disappeared from the active list are marked inactive, not deleted.
  const activeIds = new Set(providers.map((p) => p.operation_id));
  const gone = [...known.keys()].filter((id) => !activeIds.has(id));

  const acs = await fetchAcsByZcta({ key: env.CENSUS_API_KEY });
  const need = computeNeed(capacityByZip(providers), acs).map((r) => ({ ...r, computed_at: new Date().toISOString() }));

  if (dryRun) return { upserts: rows.length, inactive: gone.length, zctas: need.length, sample: need.slice(0, 5) };

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.rpc('upsert_providers', { payload: rows.slice(i, i + 500) });
    if (error) throw error;
  }
  if (gone.length) {
    const { error } = await db.from('providers').update({ active: false }).in('operation_id', gone);
    if (error) throw error;
  }
  const { error: needErr } = await db.from('zcta_need').upsert(need, { onConflict: 'zcta' });
  if (needErr) throw needErr;

  return { upserts: rows.length, inactive: gone.length, zctas: need.length };
}

export const handler = async (event = {}) => {
  const result = await run({ dryRun: Boolean(event.dryRun) });
  console.log(JSON.stringify({ step: 'done', ...result }));
  return result;
};
