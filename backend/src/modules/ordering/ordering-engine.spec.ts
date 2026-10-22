import { areaKey, Candidate, DEFAULT_WEIGHTS, haversineKm, homeWindows, isOfferedWindow, mergeWeights, rank, sortCompare, suggestSplit, totalOf } from './ordering-engine';

const T0 = new Date('2026-10-22T06:00:00Z'); // 09:00 in Riyadh
const cand = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  provider_id: id, name_ar: null, name_en: null, rating: 4, reliability: 0.9, distance_km: 5, in_network: false, prices: { a: 100 }, home_fee: 20,
  turnaround_hours: 24, earliest_at: T0, coverage: {}, ...over,
});

describe('M3 ordering engine (pure parts)', () => {
  it('haversine: about 111 km per degree of latitude, zero for the same point', () => {
    expect(Math.round(haversineKm(24, 46, 25, 46))).toBe(111);
    expect(haversineKm(24.7, 46.7, 24.7, 46.7)).toBe(0);
  });

  it('total adds the home fee only for home', () => {
    const c = cand('p', { prices: { a: 60, b: 90 } });
    expect(totalOf(c, ['a', 'b'], 'home')).toBe(170);
    expect(totalOf(c, ['a', 'b'], 'facility')).toBe(150);
  });

  it('weights: defaults, valid overrides only', () => {
    expect(mergeWeights(undefined)).toEqual(DEFAULT_WEIGHTS);
    expect(mergeWeights({ price: 100, coverage: -5, rating: 'x', distance: 5000 })).toEqual({ ...DEFAULT_WEIGHTS, price: 100 });
  });

  it('rank follows the weights: price only picks the cheapest, distance only the nearest', () => {
    const cheap = cand('cheap', { prices: { a: 50 }, distance_km: 9 });
    const near = cand('near', { prices: { a: 90 }, distance_km: 1 });
    const zero = { coverage: 0, network: 0, distance: 0, speed: 0, rating: 0, reliability: 0, price: 0 };
    expect(rank([near, cheap], ['a'], 'facility', 'cash', { ...zero, price: 100 })[0].c.provider_id).toBe('cheap');
    expect(rank([cheap, near], ['a'], 'facility', 'cash', { ...zero, distance: 100 })[0].c.provider_id).toBe('near');
  });

  it('rank: on an insurance quote the in-network provider wins at equal terms; a tie is stable by id', () => {
    const a = cand('a', { in_network: false });
    const b = cand('b', { in_network: true });
    expect(rank([a, b], ['a'], 'facility', 'insurance', DEFAULT_WEIGHTS)[0].c.provider_id).toBe('b');
    expect(rank([cand('y'), cand('x')], ['a'], 'facility', 'cash', DEFAULT_WEIGHTS).map((r) => r.c.provider_id)).toEqual(['x', 'y']);
  });

  it('sortCompare orders by the chosen key and leaves the ranking when none is given', () => {
    const rows = rank([cand('p', { prices: { a: 80 }, distance_km: 1, rating: 3 }), cand('q', { prices: { a: 60 }, distance_km: 8, rating: 5 })], ['a'], 'facility', 'cash', DEFAULT_WEIGHTS);
    expect(sortCompare(rows, 'cheapest')[0].c.provider_id).toBe('q');
    expect(sortCompare(rows, 'nearest')[0].c.provider_id).toBe('p');
    expect(sortCompare(rows, 'rating')[0].c.provider_id).toBe('q');
    expect(sortCompare(rows, undefined)).toBe(rows);
  });

  it('split: fewest providers, then lowest total, one home fee per provider', () => {
    const a = cand('a', { prices: { x: 50, y: 200 } });
    const b = cand('b', { prices: { y: 80 } });
    const c = cand('c', { prices: { x: 40 } });
    const facility = suggestSplit([a, b, c], ['x', 'y'], 'facility');
    expect(facility?.total).toBe(120); // x at c (40) + y at b (80)
    expect(facility?.assignments).toEqual([{ provider_id: 'b', catalog_ids: ['y'] }, { provider_id: 'c', catalog_ids: ['x'] }]);
    expect(suggestSplit([a, b, c], ['x', 'y'], 'home')?.total).toBe(160); // two fees of 20
    expect(suggestSplit([a], ['x', 'z'], 'facility')).toBeNull();
  });

  it('home windows: 2 hours, 08:00-20:00 at +3, none already started, three days', () => {
    const w = homeWindows(T0, 3);
    expect(w[0].start).toBe('2026-10-22T07:00:00.000Z'); // 10:00 local: 09:00 is the current hour, 08:00 is past
    expect(new Date(w[0].end).getTime() - new Date(w[0].start).getTime()).toBe(2 * 3_600_000);
    expect(w.every((x) => new Date(x.start).getTime() > T0.getTime())).toBe(true);
    expect(new Set(w.map((x) => x.start.slice(0, 10))).size).toBe(3);
    expect(w[w.length - 1].end).toBe('2026-10-24T17:00:00.000Z'); // 20:00 local on the third day
  });

  it('only an offered window passes', () => {
    const w = homeWindows(T0)[1];
    expect(isOfferedWindow(T0, w.start, w.end)).toBe(true);
    expect(isOfferedWindow(T0, w.start, '2026-10-22T20:00:00.000Z')).toBe(false);
    expect(isOfferedWindow(T0, 1, 2)).toBe(false);
  });

  it('area keys group by about 1 km', () => {
    expect(areaKey(24.7136, 46.6753)).toBe('24.71,46.68');
    expect(areaKey(24.7101, 46.6799)).toBe('24.71,46.68');
  });
});
