import type { ProviderResult } from '@/lib/data';
import { fmt, type Messages } from '@/lib/i18n';

const HHSC_SEARCH = 'https://childcare.hhs.texas.gov/Public/ChildCareSearch';

function time12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function ProviderCard({ p, t }: { p: ProviderResult; t: Messages }) {
  const open = time12(p.open_time);
  const close = time12(p.close_time);
  return (
    <li className="card">
      <h2>{p.name}</h2>
      <div className="meta">
        <span>{p.is_home ? t.result.home : t.result.center}</span>
        {p.capacity != null && <span>{fmt(t.result.capacity, { n: p.capacity })}</span>}
        {p.distance_m != null && <span>{fmt(t.result.away, { km: (p.distance_m / 1000).toFixed(1) })}</span>}
      </div>
      <div className="meta">
        {p.is_home ? <span>{t.result.approx} · {p.zip5}</span> : <span>{p.address_line}, {p.zip5}</span>}
        {open && close && <span>{t.result.hours}: {open}–{close} · {p.days.map((d) => t.days[d as keyof Messages['days']] ?? d).join(', ')}</span>}
        {p.accepts_subsidy && <span>{t.result.subsidyYes}</span>}
      </div>
      {p.nearby_routes && p.nearby_routes.length > 0 && (
        <div className="meta"><span>{t.result.routes}: {p.nearby_routes.join(', ')}</span></div>
      )}
      <div className="meta">
        {p.deficiency_high > 0 && <span className="warn">{fmt(t.result.highDef, { n: p.deficiency_high })}</span>}
        {(p.corrective_action || p.adverse_action) && <span className="warn">{t.result.action}</span>}
        {/* VERIFY: confirm the best deep link format for an operation's public HHSC record. */}
        <a href={HHSC_SEARCH} target="_blank" rel="noreferrer">{t.result.inspections}</a>
        {p.phone && <a href={`tel:${p.phone}`}>{t.result.call} {p.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}</a>}
      </div>
    </li>
  );
}
