/**
 * Nursing booking modes (lead, owner approved 2026-10-29). Every nursing catalogue row has a `booking_mode` and the `booking_options` that mode allows, so Design can build
 * one booking UI with three shapes:
 *   visit       one visit, with an optional recurrence (once | daily | weekly | monthly)
 *   continuous  hours (4 | 8 | 12 | 24), shift (day | night) and period (day | week | month | open)
 *   programme   a number of sessions from a list (4 | 6 | 8 | 10 | 12)
 * A booking carries the choice. The service decides the mode: a request that names another mode is refused. A choice outside the service's own options is refused.
 *
 * Owner 2026-10-29 (durations and recurrences). Services that are care over time (elder care and similar) offer a DURATION: 1 h, 2 h, 4 h, 8 h, 12 h, 24 h, a day or night shift,
 * for a day, for N days (`days`, 1 to 30), a week or a month. Every other service offers a RECURRENCE: once, daily, weekly, monthly, "for N times" (`sessions_count`, 1 to 30).
 * The price is decided here, not by the client: unit price x billable units (`billableUnits`), the same figure for the quote and the booking.
 * Rows that have no mode yet (before the catalogue completion is applied) behave as `visit` with the old rules, and an older client that sends none of the new fields still books
 * every service as before.
 */
import { BadRequestException } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, Max, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export const BOOKING_MODES = ['visit', 'continuous', 'programme'] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];
export const RECURRENCES = ['once', 'daily', 'weekly', 'monthly'] as const;
export const SHIFTS = ['day', 'night'] as const;
export const PERIODS = ['day', 'days', 'week', 'month', 'open'] as const;
export const HOURS = [1, 2, 4, 8, 12, 24] as const;
/** Most visits in one recurring booking, and most days in a "for N days" duration (a service can lower them with `max_times` / `max_days`). */
export const MAX_TIMES = 30;
export const MAX_DAYS = 30;
/** Days a period covers when it is billed: a day 1, a week 7, a month 30; an open-ended period is billed one day at a time (the first day is charged). */
const PERIOD_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, open: 1 };
/** Hours one billing unit of a `shift` row covers (a nursing shift). */
const SHIFT_HOURS = 12;

/** The booking fields a client may send; every one is optional (which ones apply depends on the service's mode). */
export class NursingBookingChoiceFields {
  @IsOptional() @IsIn([...BOOKING_MODES]) booking_mode?: BookingMode;
  @IsOptional() @IsIn([...RECURRENCES]) recurrence?: (typeof RECURRENCES)[number];
  @IsOptional() @IsInt() @IsIn([...HOURS]) hours?: number;
  @IsOptional() @IsIn([...SHIFTS]) shift?: (typeof SHIFTS)[number];
  @IsOptional() @IsIn([...PERIODS]) period?: (typeof PERIODS)[number];
  /** how many days, when the period is `days` ("for N days") */
  @IsOptional() @IsInt() @Min(1) @Max(MAX_DAYS) days?: number;
}

/** The options of a service row, as the catalogue stores them (admin editor and the catalogue completion write the same shape). */
export class BookingOptionsDto {
  @IsOptional() @IsArray() @IsIn([...RECURRENCES], { each: true }) recurrence?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @IsIn([...HOURS], { each: true }) hours?: number[];
  @IsOptional() @IsArray() @IsIn([...SHIFTS], { each: true }) shift?: string[];
  @IsOptional() @IsArray() @IsIn([...PERIODS], { each: true }) period?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(60, { each: true }) sessions?: number[];
  /** the most visits ("for N times") and the most days ("for N days") this service allows; the defaults are MAX_TIMES and MAX_DAYS, a service can only lower them */
  @IsOptional() @IsInt() @Min(1) @Max(MAX_TIMES) max_times?: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_DAYS) max_days?: number;
}

/** For the admin catalogue editor: the mode and its options of a nursing row. */
export class NursingCatalogBookingFields {
  @IsOptional() @IsIn([...BOOKING_MODES]) booking_mode?: BookingMode;
  @IsOptional() @ValidateNested() @Type(() => BookingOptionsDto) booking_options?: BookingOptionsDto;
}

export interface BookingChoice { booking_mode: BookingMode; recurrence?: string; hours?: number; shift?: string; period?: string; days?: number; sessions_count: number }

/** What the catalogue seeded before this change: a row that still holds exactly this has never been edited, so it gets the current defaults. */
const LEGACY_OPTIONS: Record<BookingMode, Record<string, unknown>> = {
  visit: { recurrence: ['once', 'daily', 'weekly', 'monthly'] },
  continuous: { hours: [4, 8, 12, 24], shift: ['day', 'night'], period: ['day', 'week', 'month', 'open'] },
  programme: { sessions: [4, 6, 8, 10, 12] },
};
/** What each mode offers by default (the catalogue completion seeds the same lists on a new row). */
export const DEFAULT_OPTIONS: Record<BookingMode, Record<string, unknown>> = {
  visit: { recurrence: [...RECURRENCES], max_times: MAX_TIMES },
  continuous: { hours: [...HOURS], shift: [...SHIFTS], period: [...PERIODS], max_days: MAX_DAYS },
  programme: { sessions: [4, 6, 8, 10, 12] },
};

const modeOf = (svc: { booking_mode?: string }): BookingMode => ((BOOKING_MODES as readonly string[]).includes(String(svc.booking_mode)) ? (svc.booking_mode as BookingMode) : 'visit');
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The options a service really offers: its own when an admin edited them; the current defaults when the row has none or still holds the lists the catalogue was first seeded with
 * (so the new durations and recurrences reach the rows already in production without a data change, and an edited row is never widened).
 */
export function effectiveBookingOptions(svc: { booking_mode?: string; booking_options?: Record<string, unknown> }): Record<string, unknown> {
  const mode = modeOf(svc);
  const stored = svc.booking_options;
  if (!stored || !Object.keys(stored).length || sameJson(stored, LEGACY_OPTIONS[mode])) return { ...DEFAULT_OPTIONS[mode] };
  return stored;
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const refuse = (code: string): never => { throw new BadRequestException(code); };
const cap = (stored: unknown, hard: number): number => { const n = Number(stored); return Number.isInteger(n) && n >= 1 ? Math.min(n, hard) : hard; };

/**
 * The booking choice for a service: the mode is the service's, the fields that mode needs must be present and inside the service's options, the others are ignored.
 *   visit        recurrence once | daily | weekly | monthly; `sessions_count` is the number of visits ("for N times", 1 to max_times). `once` is one visit: a count above 1 with `once` is refused.
 *                An older client that sends a count and no recurrence means "every day for N days": it books daily.
 *   continuous   hours + shift + period (+ days when the period is `days`); an older client that sends none of them books one unit as before
 *   programme    a session count from the service's list
 */
export function resolveBookingChoice(svc: { booking_mode?: string; booking_options?: Record<string, unknown> }, body: Partial<Record<string, unknown>>): BookingChoice {
  const mode = modeOf(svc);
  if (body.booking_mode !== undefined && body.booking_mode !== null && body.booking_mode !== mode) refuse('booking_mode_mismatch');
  const opts = effectiveBookingOptions(svc);
  const sessionsRaw = body.sessions_count === undefined || body.sessions_count === null ? 1 : Number(body.sessions_count);
  const sessions = Number.isFinite(sessionsRaw) ? Math.max(1, Math.floor(sessionsRaw)) : 1;
  const within = (field: 'recurrence' | 'hours' | 'shift' | 'period' | 'sessions', value: unknown, code: string) => {
    const allowed = list(opts[field]);
    if (allowed.length && !allowed.includes(value)) refuse(code);
  };
  if (mode === 'continuous') {
    // an older client that sends none of the new fields still books (as before); a client that sends some must send all
    if (body.hours === undefined && body.shift === undefined && body.period === undefined) return { booking_mode: mode, sessions_count: 1 };
    if (body.hours === undefined || body.shift === undefined || body.period === undefined) refuse('booking_options_required');
    // the quote arrives as a query string: "12" is 12
    const hours = Number(body.hours);
    if (!Number.isFinite(hours)) refuse('booking_hours_not_offered');
    within('hours', hours, 'booking_hours_not_offered');
    within('shift', body.shift, 'booking_shift_not_offered');
    within('period', body.period, 'booking_period_not_offered');
    const choice: BookingChoice = { booking_mode: mode, hours, shift: String(body.shift), period: String(body.period), sessions_count: 1 };
    if (body.period === 'days') {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > cap(opts.max_days, MAX_DAYS)) refuse('booking_days_out_of_range');
      choice.days = days;
    }
    return choice;
  }
  if (mode === 'programme') {
    // an older client that sends no session count books one session (as before); a count that is sent must be one the service offers
    if (body.sessions_count !== undefined && body.sessions_count !== null) within('sessions', sessions, 'booking_sessions_not_offered');
    return { booking_mode: mode, sessions_count: sessions };
  }
  const recurrence = body.recurrence === undefined || body.recurrence === null ? (sessions > 1 ? 'daily' : 'once') : String(body.recurrence);
  within('recurrence', recurrence, 'booking_recurrence_not_offered');
  if (recurrence === 'once') {
    if (sessions > 1) refuse('booking_times_need_recurrence');
    return { booking_mode: mode, recurrence, sessions_count: 1 };
  }
  if (sessions > cap(opts.max_times, MAX_TIMES)) refuse('booking_times_out_of_range');
  return { booking_mode: mode, recurrence, sessions_count: sessions };
}

/**
 * How many catalogue units the booking is billed for (the booking price is unit price x this). A visit or a programme: its visits or sessions. A continuous booking: the hours of every
 * day, for every day of the period, divided into the unit the row is priced in (`duration` 'hour' with `duration_value` n: n hours; 'shift': 12 hours), rounded up; the older
 * "no choice sent" booking is one unit.
 */
export function billableUnits(choice: BookingChoice, svc: { duration?: string; duration_value?: number }): number {
  if (choice.booking_mode !== 'continuous' || choice.hours === undefined) return choice.sessions_count;
  const days = choice.period === 'days' ? (choice.days ?? 1) : (PERIOD_DAYS[String(choice.period)] ?? 1);
  const unitHours = svc.duration === 'shift' ? SHIFT_HOURS : Number(svc.duration_value) > 0 ? Number(svc.duration_value) : 1;
  return Math.max(1, Math.ceil((choice.hours * days) / unitHours));
}
