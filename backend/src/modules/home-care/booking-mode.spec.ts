/**
 * Nursing booking modes: the choice rules (visit | continuous | programme), the DTO validators, HomeCareSvc.book storing the choice, and the
 * refusal of a catalogue row that has no price.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { resolveBookingChoice } from './booking-mode';
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
    expect(resolveBookingChoice({}, { sessions_count: 2 })).toEqual({ booking_mode: 'visit', recurrence: 'once', sessions_count: 2 });
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

  it('stores hours, shift and period of a continuous booking (the total is still price x 1: pricing by hours is not decided)', async () => {
    const { service, created } = make(row(continuous));
    await service.book(admin, { service_id: 's1', scheduled_at: when, hours: 12, shift: 'night', period: 'month' });
    expect(created[0]).toMatchObject({ booking_mode: 'continuous', hours: 12, shift: 'night', period: 'month', sessions_count: 1, total: 100 });
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
