// Childcare desert score per ZCTA. Mirrors the public Children at Risk definition:
// a desert is an area with more than 3 children of working parents per licensed seat.
// Note: licensed capacity includes school-age seats and is not the same as open seats.
export const DESERT_THRESHOLD = 100 / 3; // seats per 100 children

export function capacityByZip(providers) {
  const m = new Map();
  for (const p of providers) {
    if (!p.zip5 || p.capacity == null || p.temporarily_closed) continue;
    m.set(p.zip5, (m.get(p.zip5) ?? 0) + p.capacity);
  }
  return m;
}

// ZIP (USPS) and ZCTA (Census) mostly align in Houston but are not identical. Treat as approximate.
export function computeNeed(capacityMap, acsMap) {
  const rows = [];
  for (const [zcta, acs] of acsMap) {
    const capacity = capacityMap.get(zcta) ?? 0;
    const kids = acs.children_u6_working;
    const seats_per_100 = kids > 0 ? Math.round((capacity / kids) * 1000) / 10 : null;
    rows.push({
      zcta,
      children_u6_working: kids,
      capacity,
      seats_per_100,
      desert: seats_per_100 != null && seats_per_100 < DESERT_THRESHOLD,
      pct_hispanic: acs.pop_total ? round1((acs.hispanic / acs.pop_total) * 100) : null,
      pct_black: acs.pop_total ? round1(((acs.black_non_hispanic + acs.black_hispanic) / acs.pop_total) * 100) : null,
      black_hispanic: acs.black_hispanic,
      black_hispanic_moe: acs.black_hispanic_moe,
      acs_vintage: acs.acs_vintage,
    });
  }
  return rows.sort((a, b) => (a.seats_per_100 ?? Infinity) - (b.seats_per_100 ?? Infinity));
}

const round1 = (x) => Math.round(x * 10) / 10;
