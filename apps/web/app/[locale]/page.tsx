import { getMessages, fmt } from '@/lib/i18n';
import { parseSearch, searchProviders } from '@/lib/supabase';
import { ProviderCard } from '@/components/ProviderCard';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const t = getMessages(locale);
  const q = parseSearch(await searchParams);
  const results = q.zip ? await searchProviders(q) : undefined;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p>{t.tagline}</p>
      <form className="search" method="get" role="search">
        <label htmlFor="zip">{t.search.zip}
          <input id="zip" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} required defaultValue={q.zip ?? ''} autoComplete="postal-code" />
        </label>
        <label htmlFor="age">{t.search.age}
          <select id="age" name="age" defaultValue={q.age ?? ''}>
            <option value="">{t.search.ageAny}</option>
            {Object.entries(t.search.ages).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        <label htmlFor="opensBy">{t.search.opensBy}
          <input id="opensBy" name="opensBy" type="time" defaultValue={q.opensBy ?? ''} />
        </label>
        <label className="check" htmlFor="subsidy">
          <input id="subsidy" name="subsidy" type="checkbox" value="1" defaultChecked={q.subsidy === true} />
          {t.search.subsidy}
        </label>
        <button type="submit">{t.search.submit}</button>
      </form>

      {results === null && <p className="note warn">{t.search.notConfigured}</p>}
      {results && (
        <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p><strong>{fmt(t.search.results, { n: results.length })}</strong></p>
          <p className="note">{t.search.capacityNote}</p>
          {results.length === 0 ? <p>{t.search.none}</p> : (
            <ul className="results">{results.map((p) => <ProviderCard key={p.operation_id} p={p} t={t} />)}</ul>
          )}
        </section>
      )}
    </main>
  );
}
