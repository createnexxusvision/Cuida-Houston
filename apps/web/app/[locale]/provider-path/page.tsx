import { getMessages, fmt } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Step = {
  id: number; permit_type: string; step_order: number;
  title_en: string; title_es: string; body_en: string; body_es: string;
  source_url: string; verified_on: string | null;
};

export default async function ProviderPathPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getMessages(locale);
  const db = getSupabase();
  const { data } = db
    ? await db.from('pathway_steps').select('*').eq('permit_type', 'registered').order('step_order')
    : { data: null };
  const steps = (data ?? []) as Step[];
  const es = locale === 'es';

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>{t.path.title}</h2>
      <p>{t.path.intro}</p>
      {steps.length === 0 ? <p className="note">{t.path.empty}</p> : (
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.id} className="card">
              <h3 style={{ margin: 0 }}>{es ? s.title_es : s.title_en}</h3>
              <p style={{ margin: 0 }}>{es ? s.body_es : s.body_en}</p>
              <div className="meta">
                <a href={s.source_url} target="_blank" rel="noreferrer">{t.path.source}</a>
                {s.verified_on
                  ? <span>{fmt(t.path.verified, { date: s.verified_on })}</span>
                  : <span className="warn">{t.path.unverified}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
