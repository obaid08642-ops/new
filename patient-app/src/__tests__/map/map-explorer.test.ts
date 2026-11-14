import { DEFAULT_CENTRE, cardWidth, filterProviders, haversineKm, mapPhase, pickViewable, resolveCentre, savedPoint, sortNearest, type MapRow } from '../../components/map-explorer';

const row = (id: string, kind: string, lat: number | null, lng: number | null, extra: Partial<MapRow> = {}): MapRow => ({ id, kind, name: `n-${id}`, specialties: [], lat, lng, distance: null, ...extra });

describe('map explorer rules', () => {
  const rows = [row('a', 'doctor', 24.71, 46.67, { specialties: ['Cardiology'] }), row('b', 'pharmacy', 24.8, 46.7), row('c', 'doctor', null, null), row('d', 'lab', 24.72, 46.68)];

  it('filters by kind and by text in the name or a specialty', () => {
    expect(filterProviders(rows, 'all', '').map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterProviders(rows, 'doctor', '').map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterProviders(rows, 'all', 'cardio').map((r) => r.id)).toEqual(['a']);
    expect(filterProviders(rows, 'lab', 'cardio')).toEqual([]);
  });

  it('measures distance and orders nearest first, positionless last', () => {
    expect(haversineKm({ lat: 24.7, lng: 46.7 }, { lat: 24.7, lng: 46.7 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeGreaterThan(110);
    expect(sortNearest(rows, { lat: 24.8, lng: 46.7 }).map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('sizes the card so the next one peeks', () => {
    expect(cardWidth(390)).toBe(281);
    expect(cardWidth(200)).toBe(220);
    expect(cardWidth(1200)).toBe(320);
  });

  it('takes a swipe only when exactly one card is viewable', () => {
    expect(pickViewable([{ key: 'a', isViewable: true }, { key: 'b', isViewable: false }])).toBe('a');
    expect(pickViewable([{ key: 'a', isViewable: true }, { key: 'b', isViewable: true }])).toBeNull();
    expect(pickViewable([])).toBeNull();
  });

  it('centres on the phone, else on the saved address, else on the default', () => {
    expect(resolveCentre({ lat: 1, lng: 2 }, { lat: 3, lng: 4 })).toEqual({ point: { lat: 1, lng: 2 }, source: 'me' });
    expect(resolveCentre(null, { lat: 3, lng: 4 })).toEqual({ point: { lat: 3, lng: 4 }, source: 'saved' });
    expect(resolveCentre(null, null)).toEqual({ point: DEFAULT_CENTRE, source: 'default' });
  });

  it('reads a saved point only when both numbers are real', () => {
    expect(savedPoint({ lat: 21.5, lng: 39.2 })).toEqual({ lat: 21.5, lng: 39.2 });
    expect(savedPoint({ lat: '21', lng: 39 })).toBeNull();
    expect(savedPoint({ lat: 120, lng: 39 })).toBeNull();
    expect(savedPoint(null)).toBeNull();
  });

  it('names the screen state', () => {
    expect(mapPhase({ loading: true, failed: false, total: 0, shown: 0, filtered: false })).toBe('loading');
    expect(mapPhase({ loading: false, failed: true, total: 0, shown: 0, filtered: false })).toBe('failed');
    expect(mapPhase({ loading: false, failed: false, total: 0, shown: 0, filtered: false })).toBe('empty');
    expect(mapPhase({ loading: false, failed: false, total: 3, shown: 0, filtered: true })).toBe('emptyFiltered');
    expect(mapPhase({ loading: false, failed: false, total: 3, shown: 2, filtered: true })).toBe('ready');
  });
});
