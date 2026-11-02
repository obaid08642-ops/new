import { parsePromoInput, promoBoundary, promoState } from './commission-promo';

const base = { starts_at: null as Date | null, ends_at: null as Date | null, max_orders: null as number | null, used_orders: 0, active: true };

describe('promoBoundary: a plain date is a Saudi day (UTC+3)', () => {
  it('starts at 00:00 and ends at 23:59:59.999 local time', () => {
    expect(promoBoundary('2026-11-10', 'start')?.toISOString()).toBe('2026-11-09T21:00:00.000Z');
    expect(promoBoundary('2026-11-10', 'end')?.toISOString()).toBe('2026-11-10T20:59:59.999Z');
  });
  it('a full instant is kept; empty is no boundary; nonsense is an invalid date', () => {
    expect(promoBoundary('2026-11-10T08:00:00Z', 'end')?.toISOString()).toBe('2026-11-10T08:00:00.000Z');
    expect(promoBoundary(undefined, 'start')).toBeNull();
    expect(Number.isNaN(promoBoundary('tomorrow', 'end')?.getTime())).toBe(true);
  });
});

describe('promoState: the boundary dates', () => {
  const p = { ...base, starts_at: promoBoundary('2026-11-10', 'start'), ends_at: promoBoundary('2026-11-20', 'end') };
  const at = (iso: string) => promoState(p, new Date(iso));
  it('scheduled one millisecond before it starts, active at the first instant', () => {
    expect(at('2026-11-09T20:59:59.999Z')).toBe('scheduled');
    expect(at('2026-11-09T21:00:00.000Z')).toBe('active');
  });
  it('active on the last instant of the last day, ended one millisecond later', () => {
    expect(at('2026-11-20T20:59:59.999Z')).toBe('active');
    expect(at('2026-11-20T21:00:00.000Z')).toBe('ended');
  });
  it('a promo with no start is active now; a cancelled one never is', () => {
    expect(promoState({ ...base, ends_at: new Date('2026-12-01') }, new Date('2026-11-01'))).toBe('active');
    expect(promoState({ ...p, active: false }, new Date('2026-11-15'))).toBe('cancelled');
  });
});

describe('promoState: the first N orders', () => {
  const p = { ...base, max_orders: 3 };
  it('active until N orders are used, exhausted at N (the 4th order is not covered)', () => {
    expect([0, 1, 2].map((used) => promoState({ ...p, used_orders: used }, new Date()))).toEqual(['active', 'active', 'active']);
    expect(promoState({ ...p, used_orders: 3 }, new Date())).toBe('exhausted');
    expect(promoState({ ...p, used_orders: 4 }, new Date())).toBe('exhausted');
  });
  it('dates and N together: whichever ends first ends the promo', () => {
    const both = { ...p, ends_at: new Date('2026-12-01') };
    expect(promoState({ ...both, used_orders: 1 }, new Date('2026-11-01'))).toBe('active');
    expect(promoState({ ...both, used_orders: 3 }, new Date('2026-11-01'))).toBe('exhausted');
    expect(promoState({ ...both, used_orders: 1 }, new Date('2026-12-02'))).toBe('ended');
  });
});

describe('parsePromoInput', () => {
  it('0% is a valid promo (free of commission)', () => {
    expect(parsePromoInput({ percent: 0, ends_at: '2026-12-31' })).toMatchObject({ ok: true, value: { percent: 0, max_orders: null } });
  });
  it('needs an end: dates or a number of orders', () => {
    expect(parsePromoInput({ percent: 5 })).toEqual({ ok: false, error: 'promo_needs_an_end' });
    expect(parsePromoInput({ percent: 5, max_orders: 20 })).toMatchObject({ ok: true });
  });
  it('refuses a percent outside 0..100, a bad date, an end before the start, a bad order count', () => {
    for (const percent of [-1, 101, 'x', undefined, null, '']) expect(parsePromoInput({ percent, max_orders: 5 })).toEqual({ ok: false, error: 'percent_out_of_range' });
    expect(parsePromoInput({ percent: 5, ends_at: 'soon' })).toEqual({ ok: false, error: 'invalid_date' });
    expect(parsePromoInput({ percent: 5, starts_at: '2026-12-10', ends_at: '2026-12-01' })).toEqual({ ok: false, error: 'ends_before_start' });
    for (const max_orders of [0, 1.5, 100001, 'x']) expect(parsePromoInput({ percent: 5, max_orders })).toEqual({ ok: false, error: 'max_orders_out_of_range' });
  });
  it('the same day as start and end is one whole day', () => {
    const r: any = parsePromoInput({ percent: 5, starts_at: '2026-11-10', ends_at: '2026-11-10' });
    expect(r.ok).toBe(true);
    expect(r.value.ends_at.getTime() - r.value.starts_at.getTime()).toBe(24 * 3600 * 1000 - 1);
  });
});
