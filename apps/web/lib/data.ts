import { getDb } from '@/lib/db';

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
  const db = await getDb();
  if (!db) return null;
  return db.json<ProviderResult>(
    `select to_jsonb(r)::text as j
       from search_providers(p_zip => :zip::char(5), p_age => :age, p_subsidy => :subsidy,
                             p_opens_by => :opens_by::time, p_day => :day, p_limit => 50) r`,
    { zip: p.zip ?? null, age: p.age ?? null, subsidy: p.subsidy ?? null, opens_by: p.opensBy ?? null, day: p.day ?? null },
  );
}
