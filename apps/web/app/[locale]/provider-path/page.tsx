import { getMessages, fmt } from '@/lib/i18n';
import { getDb } from '@/lib/db';
import { evaluate, parseAnswers } from '@/lib/eligibility';

export const dynamic = 'force-dynamic';

const LAW_URL = 'https://statutes.capitol.texas.gov/Docs/HR/htm/HR.42.htm';

type Step = {
  id: number; permit_type: string; step_order: number;
  title_en: string; title_es: string; body_en: string; body_es: string;
  source_url: string; verified_on: string | null;
};

function Radio({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  const id = `${name}-${value}`;
  return (
    <label className="check" htmlFor={id}>
      <input type="radio" id={id} name={name} value={value} defaultChecked={checked} required={name !== 'paid'} />
      {label}
    </label>
  );
}

export default async function ProviderPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const t = getMessages(locale);
  const q = t.quiz;
  const answers = parseAnswers(await searchParams);
  const result = evaluate(answers);
  const es = locale === 'es';

  let steps: Step[] = [];
  if (result?.permitType) {
    const db = await getDb();
    if (db) {
      steps = await db.json<Step>(
        `select to_jsonb(s)::text as j from pathway_steps s where s.permit_type = :permit order by s.step_order`,
        { permit: result.permitType },
      );
    }
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>{t.path.title}</h2>
      <p>{t.path.intro}</p>

      <form className="card quiz" method="get" aria-labelledby="quiz-title">
        <h3 id="quiz-title" style={{ margin: 0 }}>{q.title}</h3>
        <p className="note" style={{ margin: 0 }}>{q.intro}</p>
        <fieldset>
          <legend>{q.location}</legend>
          <Radio name="location" value="home" label={q.locHome} checked={answers.location === 'home'} />
          <Radio name="location" value="other" label={q.locOther} checked={answers.location === 'other'} />
        </fieldset>
        <fieldset>
          <legend>{q.unrelated}</legend>
          {([['0', q.c0], ['1-3', q.c13], ['4-6', q.c46], ['7-12', q.c712], ['13+', q.c13p]] as const).map(([v, l]) => (
            <Radio key={v} name="unrelated" value={v} label={l} checked={answers.unrelated === v} />
          ))}
        </fieldset>
        <fieldset>
          <legend>{q.paid}</legend>
          <Radio name="paid" value="yes" label={q.yes} checked={answers.paid === true} />
          <Radio name="paid" value="no" label={q.no} checked={answers.paid === false} />
        </fieldset>
        <fieldset>
          <legend>{q.deed}</legend>
          <Radio name="deed" value="no" label={q.deedNo} checked={answers.deed === 'no'} />
          <Radio name="deed" value="yes" label={q.deedYes} checked={answers.deed === 'yes'} />
          <Radio name="deed" value="unsure" label={q.deedUnsure} checked={answers.deed === 'unsure'} />
        </fieldset>
        <button type="submit">{result ? q.again : q.submit}</button>
      </form>

      {result && (
        <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.deedWarning && (
            <p className={`card ${result.deedWarning === 'blocker' ? 'alert' : ''}`} role={result.deedWarning === 'blocker' ? 'alert' : undefined}>
              {result.deedWarning === 'blocker' ? q.deedBlocker : q.deedCheck}{' '}
              <a href="https://www.houstontx.gov/planning/Neighborhood/deed_restr.html" target="_blank" rel="noreferrer">{t.path.source}</a>
            </p>
          )}
          <p className="card result">
            <strong>{q.outcomes[result.outcome]}</strong>{' '}
            <a href={LAW_URL} target="_blank" rel="noreferrer">{q.law}</a>
          </p>
          {result.permitType && (steps.length === 0 ? <p className="note">{t.path.empty}</p> : (
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
          ))}
        </section>
      )}
    </main>
  );
}
