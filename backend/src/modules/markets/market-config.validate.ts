import { MarketConfig, Weekday } from './market-config.types';

import { CURRENCY_EXPONENTS } from '../../common/currency';

/** The exponent table now lives in `common/currency.ts` (one place for the money helpers and this validator); re-exported for the existing imports. */
export { CURRENCY_EXPONENTS };

const WEEKDAYS: readonly Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function validTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** Returns the list of problems; empty = valid. Pure. */
export function validateMarketConfig(c: MarketConfig): string[] {
  const e: string[] = [];
  const cur = c?.currency;
  if (!cur || typeof cur.code !== 'string' || !/^[A-Z]{3}$/.test(cur.code)) e.push('currency.code must be an ISO 4217 code');
  else if (CURRENCY_EXPONENTS[cur.code] === undefined) e.push(`currency.code ${cur.code} is not in the exponent table`);
  else if (cur.exponent !== CURRENCY_EXPONENTS[cur.code]) e.push(`currency.exponent must be ${CURRENCY_EXPONENTS[cur.code]} for ${cur.code}`);
  const t = c?.tax;
  if (!t || typeof t.scheme !== 'string' || !t.scheme) e.push('tax.scheme required');
  if (!t || typeof t.vat_percent !== 'number' || !(t.vat_percent >= 0 && t.vat_percent <= 100)) e.push('tax.vat_percent must be 0..100');
  if (!t || typeof t.inclusive !== 'boolean') e.push('tax.inclusive must be boolean');
  if (typeof c?.timezone !== 'string' || !validTimeZone(c.timezone)) e.push('timezone must be an IANA zone');
  const w = c?.calendar?.weekend;
  if (!Array.isArray(w) || w.length === 0 || w.some((d) => !WEEKDAYS.includes(d))) e.push('calendar.weekend must list weekdays');
  const l = c?.locales;
  if (!l || !Array.isArray(l.enabled) || l.enabled.length === 0 || !l.enabled.includes(l.default)) e.push('locales.default must be one of locales.enabled');
  const p = c?.phone;
  if (!p || !/^\+\d{1,3}$/.test(p.default_dial ?? '')) e.push('phone.default_dial must look like +966');
  else {
    try { new RegExp(p.national_number_pattern); } catch { e.push('phone.national_number_pattern is not a valid regex'); }
    if (typeof p.trunk_prefix !== 'string') e.push('phone.trunk_prefix must be a string');
    if (!Number.isInteger(p.national_length) || p.national_length < 4 || p.national_length > 14) e.push('phone.national_length must be 4..14');
  }
  if (!/^[0-9+]{2,15}$/.test(c?.emergency_numbers?.ambulance ?? '')) e.push('emergency_numbers.ambulance must be digits');
  const o = c?.branding?.operated_by;
  if (o !== null && (typeof o !== 'string' || !o.trim())) e.push('branding.operated_by must be null or text');
  return e;
}
