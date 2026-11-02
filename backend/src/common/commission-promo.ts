/**
 * Per-provider commission promotions (owner decision 2026-11-01): commission X% (0 allowed) from date A to date B, or for the first N
 * completed orders. When the promo ends the provider's normal commission applies again, automatically: nothing is edited.
 * Stored in `provider_commission_promos`; CommissionResolver reads it first for the provider, `provider-ops.creditEarning` counts an
 * order against it.
 */
export type PromoState = 'scheduled' | 'active' | 'ended' | 'exhausted' | 'cancelled';

export interface CommissionPromo {
  id: string;
  provider_account_id: string;
  percent: number;
  starts_at: Date | null;
  ends_at: Date | null;
  /** the first N completed orders; null = no order limit */
  max_orders: number | null;
  /** completed orders credited under this promo so far */
  used_orders: number;
  active: boolean;
}

export const PROMO_COLLECTION = 'provider_commission_promos';

/**
 * A date written as `YYYY-MM-DD` is a day in Saudi Arabia (UTC+3, no daylight saving): it starts at 00:00:00.000 and ends at
 * 23:59:59.999 local time. Anything else must be a full ISO instant.
 */
export function promoBoundary(input: unknown, edge: 'start' | 'end'): Date | null {
  if (input === undefined || input === null || input === '') return null;
  const text = String(input).trim();
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const d = day
    ? new Date(`${text}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+03:00`)
    : /^\d{4}-\d{2}-\d{2}T/.test(text) ? new Date(text) : new Date(NaN);
  return Number.isNaN(d.getTime()) ? new Date(NaN) : d;
}

/** The state of a promo at `now`. Both ends of the window count as inside it: it is active at `starts_at` and at `ends_at`. */
export function promoState(p: Pick<CommissionPromo, 'starts_at' | 'ends_at' | 'max_orders' | 'used_orders' | 'active'>, now: Date): PromoState {
  if (p.active === false) return 'cancelled';
  if (p.starts_at && now.getTime() < new Date(p.starts_at).getTime()) return 'scheduled';
  if (p.ends_at && now.getTime() > new Date(p.ends_at).getTime()) return 'ended';
  if (p.max_orders !== null && p.max_orders !== undefined && Number(p.used_orders || 0) >= Number(p.max_orders)) return 'exhausted';
  return 'active';
}

export interface PromoInput { percent: number; starts_at: Date | null; ends_at: Date | null; max_orders: number | null; note: string | null }

/** Validates what the admin sent. Returns the clean input or the error code (a promo with no end would never stop, so one limit is required). */
export function parsePromoInput(body: any): { ok: true; value: PromoInput } | { ok: false; error: string } {
  const percent = Number(body?.percent);
  if (body?.percent === undefined || body?.percent === null || body?.percent === '' || !Number.isFinite(percent) || percent < 0 || percent > 100) return { ok: false, error: 'percent_out_of_range' };
  const starts = promoBoundary(body?.starts_at, 'start');
  const ends = promoBoundary(body?.ends_at, 'end');
  if ((starts && Number.isNaN(starts.getTime())) || (ends && Number.isNaN(ends.getTime()))) return { ok: false, error: 'invalid_date' };
  let max: number | null = null;
  if (body?.max_orders !== undefined && body?.max_orders !== null && body?.max_orders !== '') {
    max = Number(body.max_orders);
    if (!Number.isInteger(max) || max < 1 || max > 100000) return { ok: false, error: 'max_orders_out_of_range' };
  }
  if (!ends && max === null) return { ok: false, error: 'promo_needs_an_end' };
  if (starts && ends && ends.getTime() < starts.getTime()) return { ok: false, error: 'ends_before_start' };
  const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;
  return { ok: true, value: { percent: Math.round(percent * 100) / 100, starts_at: starts, ends_at: ends, max_orders: max, note } };
}
