/**
 * Nursing booking modes (lead, owner approved 2026-10-29). Every nursing catalogue row has a `booking_mode` and the `booking_options` that mode allows, so Design can build
 * one booking UI with three shapes:
 *   visit       one visit, with an optional recurrence (once | daily | weekly | monthly)
 *   continuous  hours (4 | 8 | 12 | 24), shift (day | night) and period (day | week | month | open)
 *   programme   a number of sessions from a list (4 | 6 | 8 | 10 | 12)
 * A booking carries the choice. The service decides the mode: a request that names another mode is refused. A choice outside the service's own options is refused.
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
export const PERIODS = ['day', 'week', 'month', 'open'] as const;
export const HOURS = [4, 8, 12, 24] as const;

/** The booking fields a client may send; every one is optional (which ones apply depends on the service's mode). */
export class NursingBookingChoiceFields {
  @IsOptional() @IsIn([...BOOKING_MODES]) booking_mode?: BookingMode;
  @IsOptional() @IsIn([...RECURRENCES]) recurrence?: (typeof RECURRENCES)[number];
  @IsOptional() @IsInt() @IsIn([...HOURS]) hours?: number;
  @IsOptional() @IsIn([...SHIFTS]) shift?: (typeof SHIFTS)[number];
  @IsOptional() @IsIn([...PERIODS]) period?: (typeof PERIODS)[number];
}

/** The options of a service row, as the catalogue stores them (admin editor and the catalogue completion write the same shape). */
export class BookingOptionsDto {
  @IsOptional() @IsArray() @IsIn([...RECURRENCES], { each: true }) recurrence?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @IsIn([...HOURS], { each: true }) hours?: number[];
  @IsOptional() @IsArray() @IsIn([...SHIFTS], { each: true }) shift?: string[];
  @IsOptional() @IsArray() @IsIn([...PERIODS], { each: true }) period?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(60, { each: true }) sessions?: number[];
}

/** For the admin catalogue editor: the mode and its options of a nursing row. */
export class NursingCatalogBookingFields {
  @IsOptional() @IsIn([...BOOKING_MODES]) booking_mode?: BookingMode;
  @IsOptional() @ValidateNested() @Type(() => BookingOptionsDto) booking_options?: BookingOptionsDto;
}

export interface BookingChoice { booking_mode: BookingMode; recurrence?: string; hours?: number; shift?: string; period?: string; sessions_count: number }

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const refuse = (code: string): never => { throw new BadRequestException(code); };

/**
 * The booking choice for a service: the mode is the service's, the fields that mode needs must be present and inside the service's options, the others are ignored.
 * `sessions_count` keeps its old meaning (a number of visits; default 1) for visit and for a service without a mode.
 */
export function resolveBookingChoice(svc: { booking_mode?: string; booking_options?: Record<string, unknown> }, body: Partial<Record<string, unknown>>): BookingChoice {
  const mode: BookingMode = (BOOKING_MODES as readonly string[]).includes(String(svc.booking_mode)) ? (svc.booking_mode as BookingMode) : 'visit';
  if (body.booking_mode !== undefined && body.booking_mode !== null && body.booking_mode !== mode) refuse('booking_mode_mismatch');
  const opts = svc.booking_options ?? {};
  const sessionsRaw = body.sessions_count === undefined || body.sessions_count === null ? 1 : Number(body.sessions_count);
  const sessions = Number.isFinite(sessionsRaw) ? Math.max(1, Math.floor(sessionsRaw)) : 1;
  const within = (field: 'recurrence' | 'hours' | 'shift' | 'period' | 'sessions', value: unknown, code: string) => {
    const allowed = list(opts[field]);
    if (allowed.length && !allowed.includes(value)) refuse(code);
  };
  if (mode === 'continuous') {
    // an older client that sends none of the three still books (as before); a client that sends some must send all
    if (body.hours === undefined && body.shift === undefined && body.period === undefined) return { booking_mode: mode, sessions_count: 1 };
    if (body.hours === undefined || body.shift === undefined || body.period === undefined) refuse('booking_options_required');
    within('hours', body.hours, 'booking_hours_not_offered');
    within('shift', body.shift, 'booking_shift_not_offered');
    within('period', body.period, 'booking_period_not_offered');
    return { booking_mode: mode, hours: Number(body.hours), shift: String(body.shift), period: String(body.period), sessions_count: 1 };
  }
  if (mode === 'programme') {
    // an older client that sends no session count books one session (as before); a count that is sent must be one the service offers
    if (body.sessions_count !== undefined && body.sessions_count !== null) within('sessions', sessions, 'booking_sessions_not_offered');
    return { booking_mode: mode, sessions_count: sessions };
  }
  const recurrence = body.recurrence === undefined || body.recurrence === null ? 'once' : String(body.recurrence);
  within('recurrence', recurrence, 'booking_recurrence_not_offered');
  return { booking_mode: mode, recurrence, sessions_count: sessions };
}
