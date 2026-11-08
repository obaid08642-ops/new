import { z } from "zod";

/**
 * Nursing booking options (docs/product/NURSING_BOOKING_OPTIONS.md): the service says how it is booked (`booking_mode`) and what the
 * server accepts (`booking_options`). The choice screen is built from those lists only; the price is the server's quote, never computed here.
 */
export const RECURRENCES = ["once", "daily", "weekly", "monthly"] as const;
export const SHIFTS = ["day", "night"] as const;
export const PERIODS = ["day", "days", "week", "month", "open"] as const;
export type Recurrence = (typeof RECURRENCES)[number];
export type Shift = (typeof SHIFTS)[number];
export type Period = (typeof PERIODS)[number];

/** The server's own limit per booking (doc: at most 30 visits and 30 days); used only when the service sends no `max_*`. */
const SERVER_LIMIT = 30;

export type BookingOptions =
  | { mode: "visit"; recurrence: Recurrence[]; maxTimes: number }
  | { mode: "continuous"; hours: number[]; shift: Shift[]; period: Period[]; maxDays: number }
  | { mode: "programme"; sessions: number[] };

export type BookingChoice =
  | { mode: "visit"; recurrence: Recurrence; times: number }
  | { mode: "continuous"; hours: number; shift: Shift; period: Period; days: number }
  | { mode: "programme"; sessions: number };

const count = z.number().int().positive().max(1000);
const limit = z.number().int().positive().max(1000);
const optionsSchema = z.object({
  recurrence: z.array(z.enum(RECURRENCES)).optional(),
  max_times: limit.optional(),
  hours: z.array(count).optional(),
  shift: z.array(z.enum(SHIFTS)).optional(),
  period: z.array(z.enum(PERIODS)).optional(),
  max_days: limit.optional(),
  sessions: z.array(count).optional(),
});

function unique<T>(list: T[] | undefined): T[] { return [...new Set(list ?? [])]; }
function sorted(list: number[] | undefined): number[] { return unique(list).sort((a, b) => a - b); }

/** The options of a service record, or null when the record names no mode or the lists are missing/empty (the form then books one unit, as an older client). */
export function parseBookingOptions(mode: unknown, options: unknown): BookingOptions | null {
  const parsed = optionsSchema.safeParse(options && typeof options === "object" && !Array.isArray(options) ? options : {});
  if (!parsed.success) return null;
  const o = parsed.data;
  if (mode === "visit") {
    const recurrence = RECURRENCES.filter((r) => unique(o.recurrence).includes(r));
    return recurrence.length ? { mode, recurrence, maxTimes: o.max_times ?? SERVER_LIMIT } : null;
  }
  if (mode === "continuous") {
    const hours = sorted(o.hours);
    const shift = SHIFTS.filter((s) => unique(o.shift).includes(s));
    const period = PERIODS.filter((p) => unique(o.period).includes(p));
    return hours.length && shift.length && period.length ? { mode, hours, shift, period, maxDays: o.max_days ?? SERVER_LIMIT } : null;
  }
  if (mode === "programme") {
    const sessions = sorted(o.sessions);
    return sessions.length ? { mode, sessions } : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, Math.trunc(value))); }

/** The first choice shown: always one the server offers. */
export function defaultChoice(options: BookingOptions): BookingChoice {
  if (options.mode === "visit") return { mode: "visit", recurrence: options.recurrence.includes("once") ? "once" : options.recurrence[0], times: 1 };
  if (options.mode === "continuous") return { mode: "continuous", hours: options.hours[0], shift: options.shift[0], period: options.period[0], days: 1 };
  return { mode: "programme", sessions: options.sessions[0] };
}

/** A choice made valid against the options after a change: values not offered fall back, counts are clamped, `once` is one time. */
export function normalizeChoice(options: BookingOptions, choice: BookingChoice): BookingChoice {
  const base = defaultChoice(options);
  if (options.mode === "visit" && choice.mode === "visit") {
    const recurrence = options.recurrence.includes(choice.recurrence) ? choice.recurrence : (base as { recurrence: Recurrence }).recurrence;
    return { mode: "visit", recurrence, times: recurrence === "once" ? 1 : clamp(choice.times, 1, options.maxTimes) };
  }
  if (options.mode === "continuous" && choice.mode === "continuous") {
    const b = base as Extract<BookingChoice, { mode: "continuous" }>;
    const period = options.period.includes(choice.period) ? choice.period : b.period;
    return {
      mode: "continuous",
      hours: options.hours.includes(choice.hours) ? choice.hours : b.hours,
      shift: options.shift.includes(choice.shift) ? choice.shift : b.shift,
      period,
      days: period === "days" ? clamp(choice.days, 1, options.maxDays) : 1,
    };
  }
  if (options.mode === "programme" && choice.mode === "programme") return { mode: "programme", sessions: options.sessions.includes(choice.sessions) ? choice.sessions : options.sessions[0] };
  return base;
}

/** The fields of the choice, named as the booking and quote requests name them; `days` only for the period `days`. */
export function choiceFields(choice: BookingChoice): Record<string, string | number> {
  if (choice.mode === "visit") return { recurrence: choice.recurrence, sessions_count: choice.recurrence === "once" ? 1 : choice.times };
  if (choice.mode === "continuous") return { hours: choice.hours, shift: choice.shift, period: choice.period, ...(choice.period === "days" ? { days: choice.days } : {}) };
  return { sessions_count: choice.sessions };
}

/** GET /bookings/quote for a nursing service (through the patient proxy). */
export function quotePath(serviceId: string, providerId: string, choice: BookingChoice | null): string {
  const rest = choice ? Object.entries(choiceFields(choice)).map(([key, value]) => `&${key}=${encodeURIComponent(String(value))}`).join("") : "";
  return `/api/patient/bookings/quote?kind=nursing&service_id=${encodeURIComponent(serviceId)}&provider_id=${encodeURIComponent(providerId)}${rest}`;
}

export type NursingQuote = { unitPrice: number; billableUnits: number; total: number };

/** The server's quote: total, the first line's unit price and `booking.billable_units`; null when any of them is missing. */
export function parseNursingQuote(payload: unknown): NursingQuote | null {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  const body = root && root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : root;
  if (!body) return null;
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const first = lines[0] && typeof lines[0] === "object" ? lines[0] as Record<string, unknown> : null;
  const booking = body.booking && typeof body.booking === "object" ? body.booking as Record<string, unknown> : null;
  const unitPrice = Number(first?.unit_price ?? booking?.unit_price);
  const billableUnits = Number(booking?.billable_units);
  const total = Number(body.total);
  const ok = (n: number) => Number.isFinite(n) && n >= 0;
  if (!ok(unitPrice) || !ok(billableUnits) || !ok(total) || (first?.unit_price == null && booking?.unit_price == null) || booking?.billable_units == null || body.total == null) return null;
  return { unitPrice, billableUnits, total };
}

const ERROR_KEYS: Record<string, string> = {
  booking_mode_mismatch: "errBookingModeMismatch",
  booking_options_required: "errBookingOptionsRequired",
  booking_hours_not_offered: "errBookingHoursNotOffered",
  booking_shift_not_offered: "errBookingShiftNotOffered",
  booking_period_not_offered: "errBookingPeriodNotOffered",
  booking_days_out_of_range: "errBookingDaysOutOfRange",
  booking_recurrence_not_offered: "errBookingRecurrenceNotOffered",
  booking_times_need_recurrence: "errBookingTimesNeedRecurrence",
  booking_times_out_of_range: "errBookingTimesOutOfRange",
  booking_sessions_not_offered: "errBookingSessionsNotOffered",
  service_price_not_set: "errServicePriceNotSet",
};

/** The message key (under NursingWeb) of a booking error code of the options contract, or null for any other code. */
export function bookingErrorKey(code: string): string | null { return ERROR_KEYS[code] ?? null; }
