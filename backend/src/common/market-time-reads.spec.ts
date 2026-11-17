import { BusinessRulesService } from '../modules/business-rules/business-rules.module';
import { DoctorsService } from '../modules/doctors/doctors.module';
import { SchedulingEngineService } from '../modules/provider/services/scheduling-engine.service';
import { ServiceCatalogService } from '../modules/service-catalog/service-catalog.module';
import { inMarketHours } from './market-time';

/**
 * Every local-time read that used to depend on the process time zone now reads the MARKET clock (common/market-time.ts, default Asia/Riyadh, UTC+3). The tests run with the process in UTC (the
 * containers' zone) and pin the Riyadh meaning of each read: surge, quiet hours, weekly slots, doctor and service schedules.
 */
describe('local-time reads use the market clock (Riyadh), not the process zone', () => {
  const OLD = process.env.MARKET_TIMEZONE;
  beforeAll(() => { delete process.env.MARKET_TIMEZONE; });
  afterAll(() => { if (OLD !== undefined) process.env.MARKET_TIMEZONE = OLD; });

  it('quiet hours 23-07 (Riyadh): quiet at 21:00Z (00:00 there) and 20:30Z (23:30), not at 06:00Z (09:00 there): a window across midnight matches', () => {
    expect(inMarketHours('2030-01-06T21:00:00Z', 23, 7)).toBe(true);
    expect(inMarketHours('2030-01-06T20:30:00Z', 23, 7)).toBe(true);
    expect(inMarketHours('2030-01-06T06:00:00Z', 23, 7)).toBe(false);
  });

  it('quiet hours 01-04 (Riyadh): 02:00 there (23:00Z the day before) is inside, 03:00 UTC (06:00 there) is not; an empty window never matches', () => {
    expect(inMarketHours('2030-01-05T23:00:00Z', 1, 4)).toBe(true);
    expect(inMarketHours('2030-01-06T03:00:00Z', 1, 4)).toBe(false);
    expect(inMarketHours('2030-01-06T12:00:00Z', 5, 5)).toBe(false);
  });

  it('surge: 19:00 Riyadh (16:00Z) is inside the default 18-22 peak; 17:00Z is 20:00 there; 12:00Z (15:00 there) is not', () => {
    const svc: any = Object.create(BusinessRulesService.prototype);
    svc.surgeConfig = { startHour: 18, endHour: 22, multiplier: 1.5 };
    const at = (iso: string) => { const r: any = { meta: {}, ok: true, errors: [], warnings: [] }; svc.computePricing({ service: { price: 100 }, scheduled_at: iso }, r); return r; };
    expect(JSON.stringify(at('2030-01-06T16:00:00Z'))).toContain('1.5');
    expect(JSON.stringify(at('2030-01-06T12:00:00Z'))).not.toContain('1.5');
  });

  it('weekly provider slots: a 09:00-17:00 slot (Riyadh) accepts 06:00Z (09:00 Sunday there) and refuses 12:00Z-17:00Z-as-UTC thinking; the weekday is the Riyadh weekday', async () => {
    const seen: any[] = [];
    const svc: any = Object.create(SchedulingEngineService.prototype);
    svc.slots = { findOne: (q: any) => { seen.push(q); return { lean: async () => ({ start_time: '09:00', end_time: '17:00' }) }; } };
    svc.requests = { countDocuments: async () => 0 };
    const at0900 = await svc.checkAvailability('p1', new Date('2030-01-06T06:00:00Z'), 30);       // Sunday 09:00 in Riyadh: inside
    expect(seen[0].day_of_week).toBe(0);
    expect(at0900.reason).not.toBe('outside_working_hours');
    const lateUtc = await svc.checkAvailability('p1', new Date('2030-01-06T15:00:00Z'), 30);      // 18:00 in Riyadh: outside (it would have been inside at 15:00 UTC)
    expect(lateUtc).toMatchObject({ available: false, reason: 'outside_working_hours' });
    const monday = await svc.checkAvailability('p1', new Date('2030-01-06T21:30:00Z'), 30);       // Monday 00:30 in Riyadh
    expect(seen[seen.length - 1].day_of_week).toBe(1);
    expect(monday).toMatchObject({ available: false, reason: 'outside_working_hours' });
  });

  it('doctor day schedule: block 09:00-10:00 gives slots at 06:00Z and 06:30Z; an evening block stays on its day', async () => {
    const svc: any = Object.create(DoctorsService.prototype);
    svc.doctors = { findOne: () => ({ lean: async () => ({ id: 'd1', weekly_schedule: { sun: [{ start: '09:00', end: '10:00' }], mon: [{ start: '22:00', end: '23:00' }] }, default_slot_minutes: 30 }) }) };
    svc.appts = { find: () => ({ lean: async () => [] }) };
    const out = await svc.availableSlots('d1', '2030-01-06');                         // Sunday
    expect(out.map((s: any) => s.time)).toEqual(['2030-01-06T06:00:00.000Z', '2030-01-06T06:30:00.000Z']);
    const mon = await svc.availableSlots('d1', '2030-01-07');                         // Monday evening: 22:00 Riyadh = 19:00Z the same day
    expect(mon.map((s: any) => s.time)).toEqual(['2030-01-07T19:00:00.000Z', '2030-01-07T19:30:00.000Z']);
  });

  it('service schedule: the same, with a break in Riyadh clock time', async () => {
    const svc: any = Object.create(ServiceCatalogService.prototype);
    svc.sched = { findOne: () => ({ lean: async () => ({ weekly: { sun: [{ start: '09:00', end: '11:00', breaks: [{ start: '10:00', end: '10:30' }] }] }, blocked_dates: [], slot_minutes: 30, max_per_slot: 1 }) }) };
    const out = await svc.availableSlots('a1', 'lab', '2030-01-06');
    expect(out.map((s: any) => s.time)).toEqual(['2030-01-06T06:00:00.000Z', '2030-01-06T06:30:00.000Z', '2030-01-06T07:30:00.000Z']);
  });
});
