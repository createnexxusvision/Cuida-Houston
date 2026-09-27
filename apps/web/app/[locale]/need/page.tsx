import { getMessages, fmt } from '@/lib/i18n';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Row = {
  zcta: string; children_u6_working: number | null; capacity: number | null; seats_per_100: number | null;
  desert: boolean | null; pct_hispanic: number | null; pct_black: number | null;
  black_hispanic: number | null; black_hispanic_moe: number | null; multi_county: boolean;
  acs_vintage: string | null; computed_at: string;
};

const DESERT = 100 / 3;

export default async function NeedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getMessages(locale);
  const n = t.need;
  const db = await getDb();
  const rows = db
    ? await db.json<Row>(
        `select to_jsonb(z)::text as j from (
           select zcta, children_u6_working, capacity, seats_per_100, desert, pct_hispanic, pct_black,
                  black_hispanic, black_hispanic_moe, multi_county, acs_vintage, computed_at
             from zcta_need where seats_per_100 is not null order by seats_per_100) z`)
    : [];
  const num = new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US');
  const deserts = rows.filter((r) => r.desert).length;
  const maxPer100 = Math.max(100, ...rows.map((r) => Number(r.seats_per_100) || 0));
  const afro = rows.reduce((s, r) => s + (r.black_hispanic ?? 0), 0);
  // Census guidance: MOE of a sum is approximately the square root of the sum of squared MOEs.
  const afroMoe = Math.round(Math.sqrt(rows.reduce((s, r) => s + (r.black_hispanic_moe ?? 0) ** 2, 0)));
  const vintage = rows[0]?.acs_vintage;
  const updated = rows[0]?.computed_at?.slice(0, 10);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>{n.title}</h2>
      <p style={{ margin: 0 }}>{n.intro}</p>
      {rows.length === 0 ? <p className="note">{n.empty}</p> : (
        <>
          <p className="card result" style={{ margin: 0 }}>
            <strong>{fmt(n.deserts, { n: deserts, total: rows.length })}</strong><br />
            <span className="note">{n.desertDef}</span>
          </p>
          <div className="table-wrap">
            <table className="need">
              <caption className="sr-only">{n.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{n.zip}</th>
                  <th scope="col" className="num">{n.kids}</th>
                  <th scope="col" className="num">{n.seats}</th>
                  <th scope="col">{n.per100}</th>
                  <th scope="col" className="num">{n.hisp}</th>
                  <th scope="col" className="num">{n.black}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = Number(r.seats_per_100);
                  return (
                    <tr key={r.zcta}>
                      <th scope="row">
                        <a href={`/${locale}?zip=${r.zcta}`}>{r.zcta}</a>
                        {r.multi_county && <span title={n.multi} aria-label={n.multi}> *</span>}
                      </th>
                      <td className="num">{r.children_u6_working != null ? num.format(r.children_u6_working) : '–'}</td>
                      <td className="num">{r.capacity != null ? num.format(r.capacity) : '–'}</td>
                      <td>
                        <div className="bar-row">
                          <span className="bar" aria-hidden="true">
                            <span className={`fill ${r.desert ? 'desert' : ''}`} style={{ width: `${Math.min(100, (v / maxPer100) * 100)}%` }} />
                            <span className="mark" style={{ left: `${(DESERT / maxPer100) * 100}%` }} />
                          </span>
                          <span className="num">{v.toFixed(1)}</span>
                          {r.desert && <span className="badge">{n.desert}</span>}
                        </div>
                      </td>
                      <td className="num">{r.pct_hispanic != null ? `${Number(r.pct_hispanic).toFixed(0)}%` : '–'}</td>
                      <td className="num">{r.pct_black != null ? `${Number(r.pct_black).toFixed(0)}%` : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ margin: 0 }}>* {n.multi}</p>
          <p className="note" style={{ margin: 0 }}>{fmt(n.afro, { n: num.format(afro), moe: num.format(afroMoe) })}</p>
        </>
      )}
      <section className="card">
        <h3 style={{ margin: 0 }}>{n.method}</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
          <li>{n.m1}</li><li>{n.m2}</li><li>{n.m3}</li><li>{n.m4}</li>
        </ul>
        {vintage && updated && <p className="note" style={{ margin: 0 }}>{fmt(n.vintage, { v: vintage, d: updated })}</p>}
      </section>
    </main>
  );
}
