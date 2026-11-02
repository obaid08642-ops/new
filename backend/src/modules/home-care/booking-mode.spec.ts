/**
 * Nursing booking modes: the choice rules (visit | continuous | programme), the DTO validators, HomeCareSvc.book storing the choice, and the
 * refusal of a catalogue row that has no price.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { billableUnits, DEFAULT_OPTIONS, effectiveBookingOptions, resolveBookingChoice } from './booking-mode';
import { CreateBookingDto, CreateHomeCareCatalogDto, UpdateHomeCareCatalogDto } from './home-care.dto';
import { BookDto } from '../compat/compat.dto';
import { HomeCareSvc } from './home-care.service';

const options = {
  visit: { recurrence: ['once', 'daily', 'weekly', 'monthly'] },
  continuous: { hours: [4, 8, 12, 24], shift: ['day', 'night'], period: ['day', 'week', 'month', 'open'] },
  programme: { sessions: [4, 6, 8, 10, 12] },
};
const visit = { booking_mode: 'visit', booking_options: options.visit };
const continuous = { booking_mode: 'continuous', booking_options: options.continuous };
const programme = { booking_mode: 'programme', booking_options: options.programme };
const code = (fn: () => unknown): string => { try { fn(); } catch (e) { return String((e as BadRequestException).message); } return 'no error'; };

describe('resolveBookingChoice', () => {
  it('visit: recurrence defaults to once; sessions_count keeps its old meaning', () => {
    expect(resolveBookingChoice(visit, {})).toEqual({ booking_mode: 'visit', recurrence: 'once', sessions_count: 1 });
    expect(resolveBookingChoice(visit, { recurrence: 'weekly', sessions_count: 3 })).toEqual({ booking_mode: 'visit', recurrence: 'weekly', sessions_count: 3 });
    expect(code(() => resolveBookingChoice({ ...visit, booking_options: { recurrence: ['once'] } }, { recurrence: 'daily' }))).toBe('booking_recurrence_not_offered');
  });

  it('continuous: hours, shift and period must all be sent and be offered; some without the others is refused', () => {
    expect(resolveBookingChoice(continuous, { hours: 12, shift: 'night', period: 'week' })).toEqual({ booking_mode: 'continuous', hours: 12, shift: 'night', period: 'week', sessions_count: 1 });
    expect(code(() => resolveBookingChoice(continuous, { hours: 12, shift: 'night' }))).toBe('booking_options_required');
    expect(code(() => resolveBookingChoice(continuous, { hours: 6, shift: 'night', period: 'week' }))).toBe('booking_hours_not_offered');
    expect(code(() => resolveBookingChoice({ ...continuous, booking_options: { ...options.continuous, shift: ['day'] } }, { hours: 8, shift: 'night', period: 'day' }))).toBe('booking_shift_not_offered');
    expect(code(() => resolveBookingChoice(continuous, { hours: 8, shift: 'day', period: 'year' }))).toBe('booking_period_not_offered');
  });

  it('continuous and programme still book for an older client that sends none of the new fields', () => {
    expect(resolveBookingChoice(continuous, {})).toEqual({ booking_mode: 'continuous', sessions_count: 1 });
    expect(resolveBookingChoice(programme, {})).toEqual({ booking_mode: 'programme', sessions_count: 1 });
  });

  it('programme: a session count that is sent must be one the service offers', () => {
    expect(resolveBookingChoice(programme, { sessions_count: 8 })).toEqual({ booking_mode: 'programme', sessions_count: 8 });
    expect(code(() => resolveBookingChoice(programme, { sessions_count: 5 }))).toBe('booking_sessions_not_offered');
  });

  it('the service decides the mode: another mode in the request is refused; a service with no mode is a visit', () => {
    expect(code(() => resolveBookingChoice(visit, { booking_mode: 'continuous' }))).toBe('booking_mode_mismatch');
    expect(resolveBookingChoice(visit, { booking_mode: 'visit' }).booking_mode).toBe('visit');
    expect(resolveBookingChoice({}, { sessions_count: 2 })).toEqual({ booking_mode: 'visit', recurrence: 'daily', sessions_count: 2 });   // an older client: "every day for N days"
    expect(resolveBookingChoice({}, { recurrence: 'daily' }).recurrence).toBe('daily');
  });
});

describe('DTO validators', () => {
  const errs = async (cls: new () => object, plain: object) => (await validate(plainToInstance(cls, plain) as object)).map((e) => e.property).sort();
  it('the booking DTOs accept the new fields and refuse values outside the lists', async () => {
    for (const cls of [CreateBookingDto, BookDto]) {
      expect(await errs(cls as any, { service_id: 's', booking_mode: 'continuous', hours: 24, shift: 'day', period: 'open' })).toEqual([]);
      expect(await errs(cls as any, { booking_mode: 'weekly' })).toEqual(['booking_mode']);
      expect(await errs(cls as any, { hours: 5 })).toEqual(['hours']);
      expect(await errs(cls as any, { shift: 'evening', period: 'year', recurrence: 'hourly' })).toEqual(['period', 'recurrence', 'shift']);
    }
  });
  it('the admin catalogue DTOs validate the mode and the options (nested)', async () => {
    const base = { name_ar: 'ا', name_en: 'a', category: 'c', price: 10, duration: 'hour' };
    expect(await errs(CreateHomeCareCatalogDto, { ...base, booking_mode: 'programme', booking_options: { sessions: [4, 8] } })).toEqual([]);
    expect(await errs(CreateHomeCareCatalogDto, { ...base, booking_mode: 'nope' })).toEqual(['booking_mode']);
    expect(await errs(UpdateHomeCareCatalogDto, { booking_options: { hours: [3], sessions: [0] } })).toEqual(['booking_options']);
  });
});

describe('HomeCareSvc.book', () => {
  const make = (svc: Record<string, unknown> | null) => {
    const created: any[] = [];
    const svcModel: any = { findOne: jest.fn().mockResolvedValue(svc), db: { collection: () => ({ findOne: jest.fn().mockResolvedValue({}) }) } };
    const bkgModel: any = {
      findOne: jest.fn().mockReturnValue({ lean: async () => null }),
      create: jest.fn(async (d: any) => { created.push(d); return { ...d, id: 'b1', toObject() { return { ...d, id: 'b1' }; } }; }),
      updateOne: jest.fn(),
    };
    const events: any = { emit: jest.fn() };
    const engine: any = { announceCreated: jest.fn() };
    const service = new HomeCareSvc(svcModel, bkgModel, {} as any, {} as any, {} as any, events, engine, {} as any);
    return { service, created };
  };
  const admin = { id: 'u1', role: 'admin' };
  const when = new Date(Date.now() + 86_400_000).toISOString();
  const row = (extra: Record<string, unknown>) => ({ id: 's1', name_ar: 'خدمة', name_en: 'S', price: 100, duration: 'hour', ...extra });

  it('stores the choice on the booking and prices a visit as before (price x sessions)', async () => {
    const { service, created } = make(row(visit));
    await service.book(admin, { service_id: 's1', scheduled_at: when, recurrence: 'weekly', sessions_count: 3 });
    expect(created[0]).toMatchObject({ booking_mode: 'visit', recurrence: 'weekly', sessions_count: 3, total: 300 });
  });

  it('stores hours, shift and period of a continuous booking and prices the hours: price (per hour) x 12 h x 30 days', async () => {
    const { service, created } = make(row(continuous));
    await service.book(admin, { service_id: 's1', scheduled_at: when, hours: 12, shift: 'night', period: 'month' });
    expect(created[0]).toMatchObject({ booking_mode: 'continuous', hours: 12, shift: 'night', period: 'month', sessions_count: 1, billable_units: 360, total: 36000 });
  });

  it('stores "for N days" and bills hours x days', async () => {
    const { service, created } = make(row(continuous));
    await service.book(admin, { service_id: 's1', scheduled_at: when, hours: 2, shift: 'day', period: 'days', days: 3 });
    expect(created[0]).toMatchObject({ period: 'days', days: 3, billable_units: 6, total: 600 });
  });

  it('refuses a choice the service does not offer, before anything is stored', async () => {
    const { service, created } = make(row(programme));
    await expect(service.book(admin, { service_id: 's1', scheduled_at: when, sessions_count: 5 })).rejects.toThrow('booking_sessions_not_offered');
    expect(created).toEqual([]);
  });

  it('refuses a service with no catalogue price instead of storing a NaN total', async () => {
    const { service, created } = make(row({ price: undefined }));
    await expect(service.book(admin, { service_id: 's1', scheduled_at: when })).rejects.toThrow('service_price_not_set');
    expect(created).toEqual([]);
  });
});


describe('durations and recurrences (owner 2026-10-29)', () => {
  it('a duration service offers 1 h, 2 h, a shift, 24 h, N days, a week and a month', () => {
    const o = effectiveBookingOptions({ booking_mode: 'continuous' });
    expect(o.hours).toEqual([1, 2, 4, 8, 12, 24]); expect(o.shift).toEqual(['day', 'night']); expect(o.period).toEqual(['day', 'days', 'week', 'month', 'open']); expect(o.max_days).toBe(30);
    expect(resolveBookingChoice(continuous, { hours: 1, shift: 'day', period: 'day' })).toMatchObject({ hours: 1, period: 'day' });
    expect(resolveBookingChoice(continuous, { hours: 2, shift: 'night', period: 'week' })).toMatchObject({ hours: 2, period: 'week' });
    expect(resolveBookingChoice(continuous, { hours: 24, shift: 'day', period: 'days', days: 5 })).toMatchObject({ hours: 24, period: 'days', days: 5 });
  });

  it('"for N days" needs a whole number of days from 1 to the service maximum; other periods ignore days', () => {
    for (const days of [undefined, 0, 31, 2.5, 'x']) expect(code(() => resolveBookingChoice(continuous, { hours: 8, shift: 'day', period: 'days', days }))).toBe('booking_days_out_of_range');
    expect(code(() => resolveBookingChoice({ booking_mode: 'continuous', booking_options: { ...options.continuous, hours: [8], period: ['days'], max_days: 7 } }, { hours: 8, shift: 'day', period: 'days', days: 8 }))).toBe('booking_days_out_of_range');
    expect(resolveBookingChoice(continuous, { hours: 8, shift: 'day', period: 'week', days: 99 })).not.toHaveProperty('days');
  });

  it('a recurring service offers once, daily, weekly, monthly and "for N times"; once is one visit', () => {
    expect(effectiveBookingOptions({ booking_mode: 'visit' }).recurrence).toEqual(['once', 'daily', 'weekly', 'monthly']);
    expect(resolveBookingChoice(visit, { recurrence: 'once' })).toEqual({ booking_mode: 'visit', recurrence: 'once', sessions_count: 1 });
    expect(code(() => resolveBookingChoice(visit, { recurrence: 'once', sessions_count: 3 }))).toBe('booking_times_need_recurrence');
    expect(resolveBookingChoice(visit, { recurrence: 'monthly', sessions_count: 6 })).toEqual({ booking_mode: 'visit', recurrence: 'monthly', sessions_count: 6 });
  });

  it('"for N times" is capped (30, or the service\'s own lower maximum): no booking can bill an unbounded number of visits', () => {
    expect(resolveBookingChoice(visit, { recurrence: 'daily', sessions_count: 30 }).sessions_count).toBe(30);
    expect(code(() => resolveBookingChoice(visit, { recurrence: 'daily', sessions_count: 31 }))).toBe('booking_times_out_of_range');
    expect(code(() => resolveBookingChoice(visit, { sessions_count: 1e9 }))).toBe('booking_times_out_of_range');
    const lower = { booking_mode: 'visit', booking_options: { recurrence: ['once', 'weekly'], max_times: 8 } };
    expect(code(() => resolveBookingChoice(lower, { recurrence: 'weekly', sessions_count: 9 }))).toBe('booking_times_out_of_range');
    expect(code(() => resolveBookingChoice({ booking_mode: 'visit', booking_options: { recurrence: ['once'], max_times: 99 } }, { recurrence: 'once', sessions_count: 2 }))).toBe('booking_times_need_recurrence');
  });

  it('a row that still holds the lists the catalogue was first seeded with gets the current defaults; an edited row is left alone', () => {
    expect(effectiveBookingOptions({ booking_mode: 'continuous', booking_options: options.continuous })).toEqual(DEFAULT_OPTIONS.continuous);
    expect(effectiveBookingOptions({ booking_mode: 'visit', booking_options: options.visit })).toEqual(DEFAULT_OPTIONS.visit);
    expect(effectiveBookingOptions({ booking_mode: 'programme', booking_options: undefined })).toEqual(DEFAULT_OPTIONS.programme);
    const edited = { hours: [8, 12], shift: ['day'], period: ['day'] };
    expect(effectiveBookingOptions({ booking_mode: 'continuous', booking_options: edited })).toBe(edited);
    expect(code(() => resolveBookingChoice({ booking_mode: 'continuous', booking_options: edited }, { hours: 1, shift: 'day', period: 'day' }))).toBe('booking_hours_not_offered');
  });

  it('the quote sends numbers as a query string: "12" is 12', () => {
    expect(resolveBookingChoice(continuous, { hours: '12', shift: 'day', period: 'days', days: '3' })).toMatchObject({ hours: 12, days: 3 });
    expect(code(() => resolveBookingChoice(continuous, { hours: 'abc', shift: 'day', period: 'day' }))).toBe('booking_hours_not_offered');
  });
});

describe('billableUnits (the price is unit price x this, decided by the server)', () => {
  const c = (extra: Record<string, unknown>) => ({ booking_mode: 'continuous', sessions_count: 1, ...extra }) as any;
  it('a visit or a programme bills its visits or sessions', () => {
    expect(billableUnits({ booking_mode: 'visit', recurrence: 'weekly', sessions_count: 4 }, { duration: 'hour' })).toBe(4);
    expect(billableUnits({ booking_mode: 'programme', sessions_count: 8 }, { duration: 'hour' })).toBe(8);
  });
  it('a continuous booking bills hours x days, in the unit the row is priced in, rounded up', () => {
    const hourly = { duration: 'hour', duration_value: 1 };
    expect(billableUnits(c({ hours: 1, shift: 'day', period: 'day' }), hourly)).toBe(1);
    expect(billableUnits(c({ hours: 24, shift: 'day', period: 'week' }), hourly)).toBe(168);
    expect(billableUnits(c({ hours: 12, shift: 'night', period: 'month' }), hourly)).toBe(360);
    expect(billableUnits(c({ hours: 8, shift: 'day', period: 'days', days: 5 }), hourly)).toBe(40);
    expect(billableUnits(c({ hours: 2, shift: 'day', period: 'open' }), hourly)).toBe(2);           // open-ended: the first day is billed
    expect(billableUnits(c({ hours: 8, shift: 'day', period: 'day' }), { duration: 'hour', duration_value: 4 })).toBe(2);   // priced per 4 hours
    expect(billableUnits(c({ hours: 2, shift: 'day', period: 'day' }), { duration: 'hour', duration_value: 4 })).toBe(1);   // rounded up
    expect(billableUnits(c({ hours: 24, shift: 'day', period: 'week' }), { duration: 'shift' })).toBe(14);               // priced per 12 h shift
  });
  it('the older booking that sends no choice is one unit', () => {
    expect(billableUnits({ booking_mode: 'continuous', sessions_count: 1 }, { duration: 'hour', duration_value: 4 })).toBe(1);
  });
});
