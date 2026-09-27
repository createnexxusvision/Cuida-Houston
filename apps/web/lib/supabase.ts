import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Server-side client using the public anon key. Returns null when env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export type ProviderResult = {
  operation_id: string;
  name: string;
  operation_type: string;
  is_home: boolean;
  address_line: string | null;
  zip5: string;
  lat: number | null;
  lng: number | null;
  location_precision: 'exact' | 'approx' | 'zip';
  capacity: number | null;
  ages: string[];
  accepts_subsidy: boolean;
  open_time: string | null;
  close_time: string | null;
  days: string[];
  deficiency_high: number;
  deficiency_medium_high: number;
  corrective_action: boolean;
  adverse_action: boolean;
  phone: string | null;
  distance_m: number | null;
  nearby_routes: string[] | null;
};

export type SearchParams = {
  zip?: string;
  age?: string;
  subsidy?: boolean;
  opensBy?: string;
  day?: string;
};

const AGES = new Set(['Infant', 'Toddler', 'Pre-Kindergarten', 'School']);

export function parseSearch(sp: Record<string, string | string[] | undefined>): SearchParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const zip = one('zip')?.match(/^\d{5}$/)?.[0];
  const age = one('age');
  const opensBy = one('opensBy')?.match(/^\d{2}:\d{2}$/)?.[0];
  return {
    zip,
    age: age && AGES.has(age) ? age : undefined,
    subsidy: one('subsidy') === '1' ? true : undefined,
    opensBy,
  };
}

export async function searchProviders(p: SearchParams): Promise<ProviderResult[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.rpc('search_providers', {
    p_zip: p.zip ?? null,
    p_age: p.age ?? null,
    p_subsidy: p.subsidy ?? null,
    p_opens_by: p.opensBy ?? null,
    p_day: p.day ?? null,
    p_limit: 50,
  });
  if (error) throw new Error(error.message);
  return data as ProviderResult[];
}
