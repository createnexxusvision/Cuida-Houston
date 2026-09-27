// Normalizes raw rows from the Texas HHSC Child Care Licensing dataset (data.texas.gov bc5r-88dy)
// into the shape of the `providers` table. Field names verified against the live dataset on 2026-09-26.
import { createHash } from 'node:crypto';

// Day-care operation types we list. Residential types (General Residential Operation,
// Child Placing Agency, etc.) are excluded.
export const DAYCARE_TYPES = [
  'Licensed Center',
  'Licensed Child-Care Home',
  'Registered Child-Care Home',
  'Listed Family Home',
];

// Home-based types: shown at approximate location only (privacy decision, see docs/TRD.md).
export const HOME_TYPES = new Set([
  'Licensed Child-Care Home',
  'Registered Child-Care Home',
  'Listed Family Home',
]);

const yes = (v) => typeof v === 'string' && /^(y|yes)$/i.test(v.trim());
const int = (v) => {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
};

export function zip5(raw) {
  const m = String(raw ?? '').match(/\d{5}/);
  return m ? m[0] : null;
}

export function cleanAddress(raw) {
  return String(raw ?? '')
    .replace(/\s+TX-\s*\d{5}(\s*\d{4})?\s*$/i, '') // trailing "TX- 77021 1079" artifact
    .replace(/\s+/g, ' ')
    .trim() || null;
}

// "07:00 AM-08:00 PM" -> { open: "07:00", close: "20:00" }. "-" or blank -> nulls.
export function parseHours(raw) {
  const m = String(raw ?? '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return { open: null, close: null };
  const to24 = (h, min, ap) => {
    let hh = Number(h) % 12;
    if (ap.toUpperCase() === 'PM') hh += 12;
    return `${String(hh).padStart(2, '0')}:${min}`;
  };
  return { open: to24(m[1], m[2], m[3]), close: to24(m[4], m[5], m[6]) };
}

export const splitList = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Round to ~500 m so a home provider's exact house is not pinpointed on our map.
export function approxPoint(lat, lng, step = 0.005) {
  if (lat == null || lng == null) return { lat: null, lng: null };
  const r = (x) => Math.round(x / step) * step;
  return { lat: Number(r(lat).toFixed(4)), lng: Number(r(lng).toFixed(4)) };
}

export function rowHash(row) {
  const keys = ['operation_name', 'address_line', 'zipcode', 'total_capacity', 'licensed_to_serve_ages',
    'accepts_child_care_subsidies', 'hours_of_operation', 'days_of_operation', 'operation_status',
    'temporarily_closed', 'deficiency_high', 'deficiency_medium_high', 'corrective_action', 'adverse_action'];
  return createHash('sha256').update(keys.map((k) => row[k] ?? '').join('|')).digest('hex');
}

export function cleanRow(row) {
  if (!DAYCARE_TYPES.includes(row.operation_type)) return null;
  if (row.operation_status && row.operation_status !== 'Y') return null;
  const { open, close } = parseHours(row.hours_of_operation);
  return {
    operation_id: String(row.operation_id),
    name: String(row.operation_name ?? '').replace(/\s+/g, ' ').trim(),
    operation_type: row.operation_type,
    is_home: HOME_TYPES.has(row.operation_type),
    address_line: cleanAddress(row.address_line ?? row.location_address),
    city: row.city ? String(row.city).trim() : null,
    zip5: zip5(row.zipcode ?? row.location_address),
    capacity: int(row.total_capacity),
    ages: splitList(row.licensed_to_serve_ages),
    accepts_subsidy: yes(row.accepts_child_care_subsidies),
    open_time: open,
    close_time: close,
    days: splitList(row.days_of_operation),
    deficiency_high: int(row.deficiency_high) ?? 0,
    deficiency_medium_high: int(row.deficiency_medium_high) ?? 0,
    corrective_action: yes(row.corrective_action),
    adverse_action: yes(row.adverse_action),
    temporarily_closed: yes(row.temporarily_closed),
    phone: row.phone_number ? String(row.phone_number).replace(/\D/g, '') : null,
    row_hash: rowHash(row),
  };
}

export const cleanRows = (rows) => rows.map(cleanRow).filter(Boolean);
