import { riyadhDayRange, riyadhMonthStart } from './riyadh-clock';
import { NutritionService } from '../modules/nutrition/nutrition.service';

// The server clock is UTC; the patient's day is Riyadh's (UTC+3, no daylight saving). A log written at 01:10 on the 16th
// in Riyadh (22:10 UTC on the 15th) belongs to the 16th: the web asks GET /nutrition/daily-summary?date=2026-10-16.
describe('Riyadh calendar days on a UTC server', () => {
  it('bounds a Riyadh day: 21:00 UTC the day before to 20:59:59.999 UTC', () => {
    const r = riyadhDayRange('2026-10-16')!;
    expect(r.start.toISOString()).toBe('2026-10-15T21:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-16T20:59:59.999Z');
  });

  it('today is the Riyadh day, not the UTC one', () => {
    const r = riyadhDayRange(undefined, new Date('2026-10-15T22:10:00Z'))!;
    expect(r.start.toISOString()).toBe('2026-10-15T21:00:00.000Z');
    expect(riyadhMonthStart(new Date('2026-10-31T22:10:00Z')).toISOString()).toBe('2026-10-31T21:00:00.000Z');
  });

  it('refuses a malformed or impossible day', () => {
    expect(riyadhDayRange('2026-02-30')).toBeNull();
    expect(riyadhDayRange('16/10/2026')).toBeNull();
    expect(riyadhDayRange('2026-10-16T00:00:00Z')).toBeNull();
  });

  it('water logged at 01:10 Riyadh time is in that day\'s summary', async () => {
    const at = new Date('2026-10-15T22:10:00Z');
    const water = [{ patient_id: 'p-1', amount_ml: 350, logged_at: at }];
    const inRange = (f: any) => water.filter((w) => w.logged_at >= f.logged_at.$gte && w.logged_at <= f.logged_at.$lte);
    const list = (rows: any[]) => ({ lean: async () => rows });
    const svc = new NutritionService(
      { findOne: () => ({ lean: async () => null }) } as any,
      { find: () => list([]) } as any,
      { find: (f: any) => list(inRange(f)) } as any,
      { find: () => list([]) } as any,
    );
    const day = await svc.getDailySummary('p-1', '2026-10-16');
    const before = await svc.getDailySummary('p-1', '2026-10-15');
    const ml = (s: any) => (typeof s.water === 'object' ? s.water.consumed_ml : s.water_ml);
    expect(ml(day)).toBe(350);
    expect(day.date).toBe('2026-10-16');
    expect(ml(before)).toBe(0);
  });
});
