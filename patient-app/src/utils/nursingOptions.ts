/**
 * Nursing booking options (docs/product/NURSING_BOOKING_OPTIONS.md). The server decides what a service accepts:
 * `GET /home-care/services/:id` returns `booking_mode` and `booking_options`; this file turns that into a typed model,
 * a default choice, the quote query / booking fields, and the translation key of a server refusal. It never computes a price.
 */

export type BookingMode = 'visit' | 'continuous' | 'programme';
export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly';
export type Shift = 'day' | 'night';
export type Period = 'day' | 'days' | 'week' | 'month' | 'open';

export type NursingOptions =
  | { mode: 'visit'; recurrence: Recurrence[]; maxTimes: number }
  | { mode: 'continuous'; hours: number[]; shift: Shift[]; period: Period[]; maxDays: number }
  | { mode: 'programme'; sessions: number[] };

export interface NursingChoice {
  recurrence?: Recurrence;
  /** "for N times" (visit) or the package size (programme). */
  times?: number;
  hours?: number;
  shift?: Shift;
  period?: Period;
  /** Only meaningful when period === 'days'. */
  days?: number;
}

/** The server's own limit when a service does not state one (docs: at most 30 visits / 30 days). */
export const SERVER_MAX = 30;

const RECURRENCES: readonly Recurrence[] = ['once', 'daily', 'weekly', 'monthly'];
const SHIFTS: readonly Shift[] = ['day', 'night'];
const PERIODS: readonly Period[] = ['day', 'days', 'week', 'month', 'open'];

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const posInts = (v: unknown): number[] =>
  Array.isArray(v) ? Array.from(new Set(v.map(Number).filter((n) => Number.isInteger(n) && n > 0))).sort((a, b) => a - b) : [];
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(v)) return [];
  const seen = allowed.filter((a) => v.includes(a));
  return seen;
}
const limit = (v: unknown): number => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, SERVER_MAX) : SERVER_MAX;
};

/** Accepts the service body bare or wrapped in `{ data }`; returns null when the options are missing or unusable. */
export function parseNursingOptions(raw: unknown): NursingOptions | null {
  const outer = rec(raw);
  const body = rec(outer?.data) && !outer?.booking_mode ? rec(outer?.data) : outer;
  if (!body) return null;
  const opts = rec(body.booking_options);
  if (!opts) return null;
  if (body.booking_mode === 'visit') {
    const recurrence = oneOf(opts.recurrence, RECURRENCES);
    return recurrence.length ? { mode: 'visit', recurrence, maxTimes: limit(opts.max_times) } : null;
  }
  if (body.booking_mode === 'continuous') {
    const hours = posInts(opts.hours);
    const shift = oneOf(opts.shift, SHIFTS);
    const period = oneOf(opts.period, PERIODS);
    return hours.length && shift.length && period.length ? { mode: 'continuous', hours, shift, period, maxDays: limit(opts.max_days) } : null;
  }
  if (body.booking_mode === 'programme') {
    const sessions = posInts(opts.sessions);
    return sessions.length ? { mode: 'programme', sessions } : null;
  }
  return null;
}

/** The first thing the server offers for each field. */
export function defaultChoice(o: NursingOptions): NursingChoice {
  if (o.mode === 'visit') return { recurrence: o.recurrence[0], times: 1 };
  if (o.mode === 'programme') return { times: o.sessions[0] };
  return { hours: o.hours[0], shift: o.shift[0], period: o.period[0], days: 1 };
}

/** Keeps a choice inside the offered lists (after the patient changes one field). */
export function normalizeChoice(o: NursingOptions, c: NursingChoice): NursingChoice {
  if (o.mode === 'visit') {
    const recurrence = c.recurrence && o.recurrence.includes(c.recurrence) ? c.recurrence : o.recurrence[0];
    const times = recurrence === 'once' ? 1 : Math.min(Math.max(1, Math.trunc(c.times ?? 1)), o.maxTimes);
    return { recurrence, times };
  }
  if (o.mode === 'programme') return { times: c.times !== undefined && o.sessions.includes(c.times) ? c.times : o.sessions[0] };
  const d = defaultChoice(o);
  return {
    hours: c.hours !== undefined && o.hours.includes(c.hours) ? c.hours : d.hours,
    shift: c.shift && o.shift.includes(c.shift) ? c.shift : d.shift,
    period: c.period && o.period.includes(c.period) ? c.period : d.period,
    days: Math.min(Math.max(1, Math.trunc(c.days ?? 1)), o.maxDays),
  };
}

/** The wire fields (snake_case) shared by the quote query and the booking body. Empty when there are no options (one visit as before). */
export function choiceFields(o: NursingOptions | null, c: NursingChoice): Record<string, string | number> {
  if (!o) return {};
  const n = normalizeChoice(o, c);
  if (o.mode === 'visit') return { recurrence: n.recurrence as Recurrence, sessions_count: n.times as number };
  if (o.mode === 'programme') return { sessions_count: n.times as number };
  const out: Record<string, string | number> = { hours: n.hours as number, shift: n.shift as Shift, period: n.period as Period };
  if (n.period === 'days') out.days = n.days as number;
  return out;
}

/** Query string tail for GET /bookings/quote, starting with `&` (empty when there is nothing to add). */
export function choiceQuery(o: NursingOptions | null, c: NursingChoice): string {
  return Object.entries(choiceFields(o, c)).map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`).join('');
}

/** What the quote answers: the figure to show, taken as sent by the server. */
export interface NursingQuote { unit: number; total: number; billableUnits: number | null }

export function parseQuote(res: unknown): NursingQuote | null {
  const r = rec(res);
  if (!r) return null;
  const total = Number(r.total);
  const line = Array.isArray(r.lines) ? rec(r.lines[0]) : null;
  const echo = rec(r.booking);
  const unit = Number(echo?.unit_price ?? line?.unit_price);
  if (!(Number.isFinite(total) && total > 0 && Number.isFinite(unit))) return null;
  const bu = Number(echo?.billable_units ?? line?.qty);
  return { unit, total, billableUnits: Number.isFinite(bu) && bu > 0 ? bu : null };
}

export const OPTION_ERROR_CODES = [
  'booking_mode_mismatch',
  'booking_options_required',
  'booking_hours_not_offered',
  'booking_shift_not_offered',
  'booking_period_not_offered',
  'booking_days_out_of_range',
  'booking_recurrence_not_offered',
  'booking_times_need_recurrence',
  'booking_times_out_of_range',
  'booking_sessions_not_offered',
  'service_price_not_set',
] as const;

/** Translation key for a server refusal whose message is one of the documented codes; null for anything else. */
export function optionErrorKey(message: unknown): string | null {
  const code = typeof message === 'string' ? message.trim() : '';
  return (OPTION_ERROR_CODES as readonly string[]).includes(code) ? `nur.book.err.${code}` : null;
}
