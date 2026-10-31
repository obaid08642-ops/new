import { BadRequestException } from '@nestjs/common';

/** A nursing service is offered at a real price: a finite number above 0 (text like "95" or "٩٥" is the app's job to turn into a number first). */
export const isNursingPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Registration and settings: every ticked service carries its own price above 0. Price 0 is how the old wizard said "not set" and is no longer accepted (the patient list would show a free service). */
export function assertNursingServicePrices(list: unknown): void {
  if (!Array.isArray(list)) throw new BadRequestException({ code: 'nursing_services_invalid', message: 'nursing_services must be a list of { key, price }' });
  const bad = list.filter((x) => !x || typeof x !== 'object' || typeof (x as { key?: unknown }).key !== 'string' || !(x as { key: string }).key || !isNursingPrice((x as { price?: unknown }).price))
    .map((x) => String((x as { key?: unknown } | null)?.key ?? ''));
  if (bad.length) throw new BadRequestException({ code: 'nursing_service_price_required', message: 'every service needs a price above 0', services: bad });
}

/** The fields a nursing provider may change through settings/delta (the same set registration saves for nursing and home care). */
export const NURSING_DELTA_KEYS = [
  'nursing_services', 'home_visit_radius_km', 'working_hours', 'accepts_insurance', 'accepted_insurance', 'insurance_plans', 'accepts_cash',
  'coverage_radius_km', 'home_visit_supported', 'gender', 'pricingModel', 'priceVisit', 'priceHour', 'priceDay', 'priceMonth', 'schedule_home', 'vacation_date',
] as const;

/** A nursing delta must be a non-empty set of known fields, and `nursing_services` (the list the patient reads) must be a list of { key, price > 0 }. Anything else changes nothing the patient sees, so it is refused up front. */
export function assertNursingDelta(requested: unknown): void {
  if (!requested || typeof requested !== 'object' || Array.isArray(requested)) throw new BadRequestException({ code: 'delta_shape_invalid', message: 'send the changed fields as an object' });
  const keys = Object.keys(requested as Record<string, unknown>);
  if (!keys.length) throw new BadRequestException({ code: 'delta_empty', message: 'nothing to change' });
  const unknown = keys.filter((k) => !(NURSING_DELTA_KEYS as readonly string[]).includes(k));
  if (unknown.length) throw new BadRequestException({ code: 'delta_unknown_fields', message: 'these fields are not settings of a nursing provider', fields: unknown });
  const r = requested as Record<string, unknown>;
  if (r.nursing_services !== undefined) assertNursingServicePrices(r.nursing_services);
  for (const k of ['priceVisit', 'priceHour', 'priceDay', 'priceMonth']) if (r[k] !== undefined && r[k] !== null && !isNursingPrice(r[k])) throw new BadRequestException({ code: 'nursing_price_invalid', message: `${k} must be a number above 0`, field: k });
}
