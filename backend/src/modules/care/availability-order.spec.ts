import { CareService } from './care.service';
import { NextSlotCache, orderByAvailability } from './availability-order';

describe('sort=available_today', () => {
  const NOW = Date.parse('2026-10-24T08:00:00Z'); // 11:00 in Riyadh
  const item = (id: string, next: string | null) => ({ doc: id, next });

  it('today first (soonest), then later days by their slot, then no slot last in the order they came', () => {
    const out = orderByAvailability([item('none1', null), item('tomorrow', '2026-10-25T06:00:00Z'), item('today-late', '2026-10-24T17:00:00Z'), item('none2', null), item('today-soon', '2026-10-24T09:00:00Z'), item('day-after', '2026-10-26T06:00:00Z')], NOW);
    expect(out.map((x) => x.doc)).toEqual(['today-soon', 'today-late', 'tomorrow', 'day-after', 'none1', 'none2']);
  });

  it('"today" is the Riyadh day: a slot at 22:30 UTC is already tomorrow there', () => {
    const out = orderByAvailability([item('riyadh-tomorrow', '2026-10-24T22:30:00Z'), item('riyadh-today', '2026-10-24T20:30:00Z')], NOW);
    expect(out.map((x) => x.doc)).toEqual(['riyadh-today', 'riyadh-tomorrow']);
  });

  it('the cache serves a value for a minute and is bounded', () => {
    const c = new NextSlotCache(60_000, 2);
    c.set('a', 'x', 1000);
    expect(c.get('a', 30_000)).toEqual({ hit: true, value: 'x' });
    expect(c.get('a', 62_000).hit).toBe(false);
    c.set('b', null, 1000); c.set('c', 'y', 1000);
    expect(c.get('a', 1500).hit).toBe(false); // the oldest entry was dropped at the bound
  });

  it('the list orders the rating window by free slots, pages it, and computes each doctor once per minute', async () => {
    const mk = (id: string) => ({ id, account_id: `a-${id}`, user_id: `u-${id}`, name_en: id, toObject() { return this; } });
    const docs = ['d1', 'd2', 'd3', 'd4'].map(mk);
    const nexts: Record<string, string | null> = { d1: null, d2: '2026-10-26T06:00:00Z', d3: new Date(Date.now() + 3600_000).toISOString(), d4: new Date(Date.now() + 2 * 3600_000).toISOString() };
    const nextAvailable = jest.fn(async (d: any) => nexts[d.id]);
    let query: any;
    const providerModel: any = {
      find: (q: any) => { query = q; const c: any = Promise.resolve(docs); c.sort = () => c; c.maxTimeMS = () => c; c.limit = () => Promise.resolve(docs); return c; },
      db: { collection: () => ({ find: () => ({ toArray: async () => [] }) }) },
    };
    const svc: any = new (CareService as any)(providerModel, {}, { findOne: async () => null }, { nextAvailable, hasSlotsToday: async () => false });
    const page1 = await svc.listDoctors({ sort: 'available_today', limit: 5 });
    expect(query).toMatchObject({ type: 'doctor' });
    // d3/d4 may fall on tomorrow in Riyadh near midnight; both are the soonest two either way
    expect(page1.items.map((d: any) => d.id).slice(0, 2).sort()).toEqual(['d3', 'd4']);
    expect(page1.items.map((d: any) => d.id).slice(2)).toEqual(['d2', 'd1']);
    expect(page1).toMatchObject({ page: 1, total: null, total_is_exact: false, has_more: false });
    await svc.listDoctors({ sort: 'available_today', limit: 5 });
    expect(nextAvailable).toHaveBeenCalledTimes(4);
  });
});
